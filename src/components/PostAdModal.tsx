import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Tag, Upload, MapPin, Loader2, GripVertical, AlertCircle, Cpu } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAttributesForCategory } from '../constants/attributes';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabase';
import { api, Listing } from '../services/api';
import { LazyImage } from './LazyImage';

interface PostAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editListing?: Listing | null;
}

const postAdSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title too long'),
  category: z.string().min(1, 'Please select a category'),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Price must be a positive number',
  }),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description too long'),
  condition: z.enum(['Brand New', 'Slightly Used', 'Used'] as const, {
    error: 'Please select item condition',
  }),
});

type PostAdFormData = z.infer<typeof postAdSchema>;

const SortablePhoto = ({ url, index, onRemove }: { url: string, index: number, onRemove: (index: number) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative aspect-square rounded-2xl overflow-hidden group shadow-sm ${isDragging ? 'opacity-50' : ''}`}
    >
      <LazyImage src={url} alt="Preview" className="w-full h-full object-cover" />
      
      {/* Drag Handle Overlay */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute inset-0 bg-black/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-6 h-6 text-white drop-shadow-md" />
      </div>

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-lg sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all hover:bg-red-600 z-20"
      >
        <X className="w-3 h-3" />
      </button>
      
      {index === 0 && (
        <div className="absolute bottom-0 inset-x-0 bg-emerald-500 text-white text-[8px] font-black py-0.5 text-center uppercase z-10">Main Photo</div>
      )}
    </div>
  );
};

export const PostAdModal = ({ isOpen, onClose, onSuccess, editListing }: PostAdModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());
  const [previews, setPreviews] = useState<string[]>(editListing?.images || (editListing?.image ? [editListing.image] : []));
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, string>>(editListing?.attributes || {});
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PostAdFormData>({
    resolver: zodResolver(postAdSchema),
    defaultValues: {
      title: editListing?.title || '',
      category: editListing?.category_id ? String(editListing.category_id) : '',
      price: editListing?.price ? String(editListing.price) : '',
      location: editListing?.location || '',
      description: editListing?.description || '',
      condition: editListing?.condition || 'Used',
    },
  });

  const formData = watch();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reset form when editListing changes or modal opens
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = await api.users.getMe(session.access_token);
          if (profile.location) {
            setValue('location', profile.location || '');
          }
        }
      } catch (err) {
        console.error('Error fetching user profile for default location:', err);
      }
    };

    if (isOpen) {
      if (editListing) {
        reset({
          title: editListing.title,
          category: editListing.category_id ? String(editListing.category_id) : '',
          price: String(editListing.price),
          location: editListing.location,
          description: editListing.description || '',
          condition: editListing.condition || 'Used',
        });
        
        // Handle category hierarchy for editing
        if (editListing.category_id && categories.length > 0) {
          const catId = String(editListing.category_id);
          const currentCat = categories.find(c => c.id && String(c.id) === catId);
          
          if (currentCat) {
            if (currentCat.parent_id) {
              setSelectedMainCategory(String(currentCat.parent_id));
              setSelectedSubCategory(catId);
            } else {
              setSelectedMainCategory(catId);
              setSelectedSubCategory('');
            }
          }
        }
        
        setPreviews(editListing.images || (editListing.image ? [editListing.image] : []));
        setFileMap(new Map());
        setDynamicAttributes(editListing.attributes || {});
      } else {
        reset({ title: '', category: '', price: '', location: '', description: '', condition: 'Used' });
        setSelectedMainCategory('');
        setSelectedSubCategory('');
        setPreviews([]);
        setFileMap(new Map());
        setDynamicAttributes({});
        fetchUserProfile();
      }
    }
  }, [isOpen, editListing, categories, reset, setValue]);

  // Update category ID when main or sub category changes
  useEffect(() => {
    const finalCategoryId = selectedSubCategory || selectedMainCategory;
    setValue('category', finalCategoryId, { shouldValidate: true });
  }, [selectedMainCategory, selectedSubCategory, setValue]);

  // Fetch categories on open
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        let data = await api.categories.getAll();
        
        // Auto-seed if empty and we're in a state where we can
        if (data.length === 0) {
          try {
            await api.categories.seed();
            data = await api.categories.getAll();
          } catch (seedError) {
            console.error('Failed to auto-seed categories:', seedError);
          }
        }
        
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = previews.length;
    const remaining = 5 - currentCount;
    
    if (remaining <= 0) {
      toast.error('Maximum 5 photos allowed');
      return;
    }

    const filesToAdd = files.slice(0, remaining);
    const newPreviews: string[] = [];
    const newFileMap = new Map(fileMap);

    filesToAdd.forEach(file => {
      const url = URL.createObjectURL(file);
      newPreviews.push(url);
      newFileMap.set(url, file);
    });

    setPreviews(prev => [...prev, ...newPreviews]);
    setFileMap(newFileMap);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const urlToRemove = previews[index];
    setPreviews(prev => prev.filter((_, i) => i !== index));
    
    if (urlToRemove.startsWith('blob:')) {
      const newFileMap = new Map(fileMap);
      newFileMap.delete(urlToRemove);
      setFileMap(newFileMap);
      URL.revokeObjectURL(urlToRemove);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPreviews((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const onSubmit = async (data: PostAdFormData) => {
    setError(null);
    
    // If not editing, require photos
    if (previews.length === 0) {
      setError('Please add at least one photo');
      return;
    }

    // Check if sub-category is required
    const hasSubCategories = categories.some(c => String(c.parent_id) === selectedMainCategory);
    if (hasSubCategories && !selectedSubCategory) {
      setError('Please select a specific sub-category');
      return;
    }

    const price = Number(data.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to post an ad');

      // 1. Upload images to Supabase Storage if new ones selected
      const finalImageUrls: string[] = [];
      
      for (const url of previews) {
        if (url.startsWith('blob:')) {
          const file = fileMap.get(url);
          if (file) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${session.user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('listings')
              .upload(filePath, file);

            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
              .from('listings')
              .getPublicUrl(filePath);
              
            finalImageUrls.push(urlData.publicUrl);
          }
        } else {
          finalImageUrls.push(url);
        }
      }

      // 2. Create or Update listing in database
      let categoryName = '';
      let categoryId = '';

      if (selectedSubCategory === 'other') {
        const parent = categories.find(c => String(c.id) === selectedMainCategory);
        categoryName = `Other ${parent?.name || 'Uncategorized'}`;
        categoryId = selectedMainCategory; // Use parent ID as fallback
      } else {
        const subCat = categories.find(c => String(c.id) === selectedSubCategory);
        const mainCat = categories.find(c => String(c.id) === selectedMainCategory);
        
        if (subCat) {
          categoryName = subCat.name;
          categoryId = String(subCat.id);
        } else if (mainCat) {
          categoryName = mainCat.name;
          categoryId = String(mainCat.id);
        }
      }
      
      const listingPayload: any = {
        title: data.title,
        price: price,
        location: data.location,
        image: finalImageUrls[0], // Primary thumbnail
        images: finalImageUrls,   // All images for gallery
        description: data.description,
        category: categoryName,
        category_id: categoryId,
        condition: data.condition,
        attributes: dynamicAttributes,
      };

      if (editListing) {
        await api.listings.update(editListing.id, listingPayload, session.access_token);
      } else {
        listingPayload.isPromoted = false;
        await api.listings.create(listingPayload, session.access_token);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset state
        setSuccess(false);
        if (!editListing) {
          reset({ title: '', category: '', price: '', location: '', description: '', condition: 'Used' });
          setFileMap(new Map());
          setPreviews([]);
        }
      }, 2000);

    } catch (error: any) {
      console.error('Error posting ad:', error);
      let errorMessage = 'Failed to post ad. Please try again.';
      
      if (error instanceof Error) {
        try {
          // Try to parse JSON error from backend if it's a fetch error
          const parsed = JSON.parse(error.message);
          errorMessage = parsed.error || parsed.details || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white w-full sm:max-w-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[95vh] pb-[env(safe-area-inset-bottom)]"
          >
          {/* Header */}
          <div className="p-5 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none">
                {editListing ? 'Edit Ad' : 'Post Ad'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                {editListing ? 'Update your listing details' : 'List your item in seconds'}
              </p>
            </div>
            <button 
              onClick={onClose}
              aria-label="Close modal"
              className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all active:scale-95"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {success ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500"
              >
                <CheckCircle2 className="w-12 h-12" />
              </motion.div>
              <h3 className="text-2xl font-black text-gray-900">Success!</h3>
              <p className="text-gray-500 font-medium">Your ad has been posted and is now live.</p>
            </div>
          ) : (
            <>
              {/* Form Content */}
              <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
                {(error || Object.keys(errors).length > 0) && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold flex flex-col gap-2">
                    {error && (
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    {Object.entries(errors).map(([field, err]) => (
                      <div key={field} className="flex items-center gap-3">
                        <AlertCircle className="w-4 h-4" />
                        <span className="capitalize">{field}:</span> {err?.message as string}
                      </div>
                    ))}
                  </div>
                )}
                {/* Step 1: Category & Photos */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm">1</div>
                    <label className="text-sm font-black text-gray-900 uppercase tracking-widest">Category & Photos</label>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Main Category Dropdown */}
                    <div className="relative group">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <select
                        className={`w-full pl-12 pr-10 py-4 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-semibold appearance-none cursor-pointer text-sm ${errors.category ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-emerald-500 focus:bg-white'}`}
                        value={selectedMainCategory}
                        onChange={(e) => {
                          setSelectedMainCategory(e.target.value);
                          setSelectedSubCategory(''); // Reset sub-category
                        }}
                        disabled={categoriesLoading}
                      >
                        <option value="">{categoriesLoading ? 'Loading...' : 'Main Category'}</option>
                        {categories.filter(c => !c.parent_id).map((cat, idx) => (
                          <option key={cat.id || idx} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Sub Category Dropdown */}
                    <div className="relative group">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                      <select
                        disabled={!selectedMainCategory || !categories.some(c => String(c.parent_id) === selectedMainCategory)}
                        className={`w-full pl-12 pr-10 py-4 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-semibold appearance-none cursor-pointer text-sm disabled:opacity-50 ${errors.category ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-emerald-500 focus:bg-white'}`}
                        value={selectedSubCategory}
                        onChange={(e) => setSelectedSubCategory(e.target.value)}
                      >
                        <option value="">Sub-Category</option>
                        {categories
                          .filter(c => String(c.parent_id) === selectedMainCategory)
                          .map((sub, idx) => (
                            <option key={sub.id || idx} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                        {selectedMainCategory && <option value="other">Other</option>}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {categories.length === 0 && !categoriesLoading && (
                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                        <Tag className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900">No categories found</p>
                        <p className="text-xs text-amber-700 mt-1">We need to set up the default categories first.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={async () => {
                          setCategoriesLoading(true);
                          try {
                            await api.categories.seed();
                            const data = await api.categories.getAll();
                            setCategories(data);
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setCategoriesLoading(false);
                          }
                        }}
                        className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
                      >
                        Fix Categories Now
                      </button>
                    </div>
                  )}
                  <input type="hidden" name="category" value={formData.category} required />
                </div>

                {/* Step 1.5: Dynamic Attributes */}
                {(() => {
                  const subCat = categories.find(c => String(c.id) === selectedSubCategory);
                  const mainCat = categories.find(c => String(c.id) === selectedMainCategory);
                  const catName = subCat?.name || mainCat?.name || '';
                  const attrs = getAttributesForCategory(catName);
                  
                  if (attrs.length === 0) return null;
                  
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <label className="text-sm font-black text-gray-900 uppercase tracking-widest">Specifications (Optional)</label>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium -mt-4 italic ml-11">Adding these details helps your ad stand out, but you can skip them if you want.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                        {attrs.map((attr) => (
                          <div key={attr.id} className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{attr.label}</label>
                            {attr.type === 'select' ? (
                              <select
                                value={dynamicAttributes[attr.id] || ''}
                                onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.id]: e.target.value }))}
                                className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl outline-none transition-all font-semibold text-sm shadow-sm"
                              >
                                <option value="">Select {attr.label}</option>
                                {attr.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={attr.type}
                                value={dynamicAttributes[attr.id] || ''}
                                onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.id]: e.target.value }))}
                                placeholder={attr.placeholder || `Enter ${attr.label}`}
                                className="w-full px-4 py-3 bg-white border-2 border-transparent focus:border-orange-500 rounded-xl outline-none transition-all font-semibold text-sm shadow-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-6">
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">2. Add Photos ({previews.length}/5)</label>
                  <p className="text-[10px] text-gray-400 font-medium -mt-4 italic">Tip: Drag photos to rearrange. The first photo will be the main cover.</p>
                  
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        multiple
                        aria-label="Upload photos"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        disabled={previews.length >= 5}
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Add photos"
                        className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase">Add</span>
                      </button>
                      
                      <SortableContext 
                        items={previews}
                        strategy={rectSortingStrategy}
                      >
                        {previews.map((preview, index) => (
                          <SortablePhoto 
                            key={preview} 
                            url={preview} 
                            index={index} 
                            onRemove={removeFile} 
                          />
                        ))}
                      </SortableContext>
                    </div>
                  </DndContext>
                </div>

                {/* Step 2: Details */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm">2</div>
                    <label className="text-sm font-black text-gray-900 uppercase tracking-widest">Item Details</label>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <Tag className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.title ? 'text-red-500' : 'text-gray-400 group-focus-within:text-orange-500'}`} />
                      <input
                        type="text"
                        {...register('title')}
                        maxLength={100}
                        placeholder="Ad Title (e.g. iPhone 15 Pro Max)"
                        className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-semibold text-base sm:text-sm ${errors.title ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-orange-500 focus:bg-white'}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Price */}
                      <div className="relative group">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black transition-colors text-sm ${errors.price ? 'text-red-500' : 'text-gray-400 group-focus-within:text-orange-500'}`}>Br</span>
                        <input
                          type="number"
                          {...register('price')}
                          placeholder="Price"
                          className={`w-full pl-10 pr-4 py-4 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-semibold text-base sm:text-sm ${errors.price ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-orange-500 focus:bg-white'}`}
                        />
                      </div>

                      {/* Condition */}
                      <div className="relative group">
                        <select
                          {...register('condition')}
                          className={`w-full px-4 py-4 bg-gray-50 border-2 rounded-2xl outline-none transition-all font-semibold appearance-none cursor-pointer text-sm ${errors.condition ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-orange-500 focus:bg-white'}`}
                        >
                          <option value="Brand New">Brand New</option>
                          <option value="Slightly Used">Slightly Used</option>
                          <option value="Used">Used</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing Location</p>
                        <p className="text-sm font-bold text-gray-700">{formData.location || 'Location not set'}</p>
                      </div>
                    </div>

                    <textarea
                      {...register('description')}
                      placeholder="Tell buyers more about your item..."
                      rows={4}
                      className={`w-full p-5 bg-gray-50 border-2 rounded-[2rem] outline-none transition-all font-semibold text-base sm:text-sm resize-none ${errors.description ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-orange-500 focus:bg-white'}`}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-6 sticky bottom-0 bg-white/80 backdrop-blur-md -mx-4 sm:-mx-8 px-4 sm:px-8 pb-4 z-20">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:scale-100"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="tracking-widest uppercase">{editListing ? 'Updating...' : 'Posting...'}</span>
                      </>
                    ) : (
                      <span className="tracking-widest uppercase">{editListing ? 'Update Ad' : 'Post Ad Now'}</span>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
};
