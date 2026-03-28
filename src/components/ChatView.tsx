import { useState, useEffect, useRef, FormEvent } from 'react';
import { MessageCircle, Send, User, ArrowLeft, Loader2, Package, Search, Trash2, Check, CheckCheck, RefreshCw, Image as ImageIcon, X, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/imageUtils';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  conversation_id: string;
  is_read?: boolean;
  image_url?: string;
}

interface Conversation {
  id: string;
  last_message: string;
  last_message_at: string;
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  seller: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  unread_count: number;
  all_conversation_ids: string[];
  listing: {
    id: string;
    title: string;
    image: string;
  };
}

interface ChatViewProps {
  initialConversationId?: string | null;
  onConversationSelected?: () => void;
  onBack?: () => void;
  onViewProduct?: (listing: { id: string; title: string; [key: string]: any }) => void;
}

export const ChatView = ({ initialConversationId, onConversationSelected, onBack, onViewProduct }: ChatViewProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle navigation event to auto-select conversation
    const handleNavigation = (e: any) => {
      const { conversationId } = e.detail || {};
      if (conversationId) {
        fetchConversations().then((convs) => {
          const found = convs?.find((c: any) => c.id === conversationId);
          if (found) {
            setSelectedConversation(found);
            fetchMessages(found.all_conversation_ids || [found.id]);
          }
        });
      }
    };

    window.addEventListener('navigate-to-chat', handleNavigation);

    // Initial fetch
    fetchConversations().then((convs) => {
      if (initialConversationId) {
        const found = convs?.find((c: any) => c.id === initialConversationId);
        if (found) {
          setSelectedConversation(found);
          fetchMessages(found.id);
          onConversationSelected?.();
        }
      }
    });

    return () => {
      window.removeEventListener('navigate-to-chat', handleNavigation);
    };
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      const found = conversations.find(c => c.id === initialConversationId);
      if (found) {
        setSelectedConversation(found);
        fetchMessages(found.all_conversation_ids || [found.id]);
        onConversationSelected?.();
      } else {
        // If not in current list, fetch again
        fetchConversations().then((convs) => {
          const foundNew = convs?.find((c: any) => c.id === initialConversationId);
          if (foundNew) {
            setSelectedConversation(foundNew);
            fetchMessages(foundNew.all_conversation_ids || [foundNew.id]);
            onConversationSelected?.();
          }
        });
      }
    }
  }, [initialConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      await api.chats.deleteMessage(messageId, session.access_token);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const handleTyping = () => {
    if (!selectedConversation || !currentUserId || !channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: currentUserId, isTyping: true }
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, isTyping: false }
      });
    }, 3000);
  };

  useEffect(() => {
    if (!selectedConversation?.id || !currentUserId) return;

    console.log('Setting up real-time for conversation:', selectedConversation.id);
    const conversationIds = selectedConversation.all_conversation_ids || [selectedConversation.id];
    
    // Use a unique channel name for this specific conversation view
    const channel = supabase.channel(`chat-room-${selectedConversation.id}`);
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          console.log('New message detected via real-time:', newMsg);
          
          // Check if this message belongs to the current conversation thread
          if (conversationIds.includes(newMsg.conversation_id)) {
            console.log('Message belongs to current thread, updating state...');
            
            setMessages((prev) => {
              // Prevent duplicates (e.g. if we sent it ourselves and already added it)
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            
            // Update the sidebar preview instantly
            setConversations(prev => {
              const updated = prev.map(c => {
                const isThisConv = c.id === newMsg.conversation_id || c.all_conversation_ids?.includes(newMsg.conversation_id);
                if (isThisConv) {
                  return {
                    ...c,
                    last_message: newMsg.content,
                    last_message_at: newMsg.created_at,
                    unread_count: newMsg.sender_id !== currentUserId ? (c.unread_count || 0) + 1 : c.unread_count
                  };
                }
                return c;
              });
              // Re-sort to bring active conversation to top
              return [...updated].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
            });

            // If it's an incoming message, handle read status and typing
            if (newMsg.sender_id !== currentUserId) {
              setIsOtherUserTyping(false);
              
              // Mark as read in DB
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id)
                .then(() => {
                  // Reset local unread count for this conversation
                  setConversations(prev => prev.map(c => {
                    const isThisConv = c.id === newMsg.conversation_id || c.all_conversation_ids?.includes(newMsg.conversation_id);
                    if (isThisConv) return { ...c, unread_count: 0 };
                    return c;
                  }));
                  
                  // Notify App.tsx to refresh global unread badge
                  window.dispatchEvent(new CustomEvent('refresh-unread-count'));
                });
            }
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== currentUserId) {
          setIsOtherUserTyping(payload.payload.isTyping);
        }
      })
      .subscribe((status) => {
        console.log(`Real-time subscription status for ${selectedConversation.id}:`, status);
      });

    return () => {
      console.log('Cleaning up real-time for conversation:', selectedConversation.id);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedConversation?.id, currentUserId]);

  const fetchConversations = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      
      setCurrentUserId(session.user.id);
      const data = await api.chats.getConversations(session.access_token);
      setConversations(data);
      return data;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationIds: string | string[]) => {
    setIsMessagesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const data = await api.chats.getMessages(conversationIds, session.access_token);
      setMessages(data);
      
      // Trigger unread count refresh in App.tsx
      window.dispatchEvent(new CustomEvent('refresh-unread-count'));
      
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const [isSending, setIsSending] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('listings')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listings')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation?.id || !currentUserId || isSending) return;

    const content = newMessage.trim();
    const imageToUpload = selectedImage;
    
    setNewMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      let imageUrl = undefined;
      if (imageToUpload) {
        setIsUploading(true);
        imageUrl = await uploadImage(imageToUpload);
        setIsUploading(false);
        if (!imageUrl) {
          alert('Failed to upload image. Please try again.');
          setIsSending(false);
          return;
        }
      }

      const message = await api.chats.sendMessage(selectedConversation.id, content, session.access_token, imageUrl || undefined);
      setMessages(prev => [...prev, message]);
      
      // Update conversations list locally for instant feedback
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id === selectedConversation.id) {
            return {
              ...c,
              last_message: imageUrl ? '📷 Photo' : content,
              last_message_at: new Date().toISOString()
            };
          }
          return c;
        });
        return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
      });

      // Refresh conversations silently to update last message
      fetchConversations(true);
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(content); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.listing.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading chats...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-12rem)] bg-white rounded-none md:rounded-[2.5rem] border-none md:border border-gray-100 shadow-none md:shadow-sm overflow-hidden">
      {/* Native-style Sticky Header (Mobile Only) */}
      <div className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (selectedConversation) {
                setSelectedConversation(null);
              } else if (onBack) {
                onBack();
              }
            }} 
            className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">
            {selectedConversation ? selectedConversation.other_user?.full_name : 'Messages'}
          </h1>
        </div>
        <button 
          onClick={() => {
            if (selectedConversation) {
              fetchMessages(selectedConversation.all_conversation_ids || [selectedConversation.id]);
            } else {
              fetchConversations();
            }
          }}
          className={`p-2 -mr-2 text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-95 ${isLoading || isMessagesLoading ? 'opacity-50' : ''}`}
          disabled={isLoading || isMessagesLoading}
        >
          <RefreshCw className={`w-5 h-5 ${(isLoading || isMessagesLoading) ? 'animate-spin text-emerald-500' : ''}`} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full md:w-96 border-r border-gray-100 flex flex-col bg-white ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 md:p-6 border-b border-gray-100">
            <div className="hidden md:flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Chats</h2>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <MessageCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 p-2">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-gray-400 text-sm font-semibold">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv, idx) => (
              <button
                key={conv.id || idx}
                onClick={() => {
                  if (conv.id) {
                    setSelectedConversation(conv);
                    fetchMessages(conv.all_conversation_ids || [conv.id]);
                  }
                }}
                className={`w-full p-3 flex items-center gap-3 rounded-2xl transition-all duration-200 group ${
                  selectedConversation?.id === conv.id 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'hover:bg-gray-50 text-gray-900'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 shadow-sm transition-transform group-hover:scale-105 ${
                    selectedConversation?.id === conv.id ? 'border-emerald-400' : 'border-white'
                  }`}>
                    {conv.other_user.avatar_url ? (
                      <img src={getOptimizedImageUrl(conv.other_user.avatar_url, { width: 100, height: 100 })} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${selectedConversation?.id === conv.id ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <User className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 ${selectedConversation?.id === conv.id ? 'hidden' : ''}`}></div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className={`font-bold truncate text-base ${selectedConversation?.id === conv.id ? 'text-white' : 'text-gray-900'}`}>
                      {conv.other_user?.full_name || 'User'}
                    </h4>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${selectedConversation?.id === conv.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                      {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate leading-relaxed flex-1 ${selectedConversation?.id === conv.id ? 'text-emerald-50' : 'text-gray-500'}`}>
                      {conv.last_message?.includes('[PRODUCT_IMAGE]') 
                        ? `${conv.last_message.split('[PRODUCT_IMAGE]')[0]} 📷 Photo`
                        : conv.last_message || 'Start a conversation'}
                    </p>
                    {conv.unread_count > 0 && selectedConversation?.id !== conv.id && (
                      <div className="bg-emerald-500 text-white text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-sm">
                        {conv.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col bg-gray-50/30 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="hidden md:flex px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 items-center justify-between sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-2xl transition-colors text-gray-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gray-50 overflow-hidden border-2 border-white shadow-sm">
                    {selectedConversation.other_user?.avatar_url ? (
                      <img src={getOptimizedImageUrl(selectedConversation.other_user.avatar_url, { width: 96, height: 96 })} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500"></div>
                </div>
                <div>
                  <h3 className="font-black text-gray-900 leading-tight text-lg tracking-tight">{selectedConversation.other_user?.full_name || 'User'}</h3>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Now</p>
                  </div>
                </div>
              </div>
              
              {selectedConversation.listing && (
                <button 
                  onClick={() => {
                    if (onViewProduct) {
                      onViewProduct(selectedConversation.listing);
                    } else {
                      window.location.href = `/listings/${selectedConversation.listing?.id}`;
                    }
                  }}
                  className="flex items-center gap-2 md:gap-2.5 px-2 md:px-4 py-1.5 md:py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl md:rounded-2xl border border-gray-100 transition-all group"
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Package className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Listing</p>
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[100px] md:max-w-[150px] leading-none">
                      {selectedConversation.listing.title}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar bg-gray-50/30">
              {isMessagesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUserId;
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                    
                    const isSameSenderAsPrev = prevMsg?.sender_id === msg.sender_id;
                    const isSameSenderAsNext = nextMsg?.sender_id === msg.sender_id;
                    
                    const timeDiffPrev = prevMsg ? (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) : Infinity;
                    const isRecentAsPrev = timeDiffPrev < 2 * 60 * 1000; // 2 minutes threshold
                    
                    const timeDiffNext = nextMsg ? (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime()) : Infinity;
                    const isRecentAsNext = timeDiffNext < 2 * 60 * 1000;
                    
                    const isFirstInGroup = !isSameSenderAsPrev || !isRecentAsPrev;
                    const isLastInGroup = !isSameSenderAsNext || !isRecentAsNext;

                    return (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`flex group gap-3 ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-6' : 'mt-1'}`}
                      >
                        {!isMe && (
                          <div className="w-8 h-8 flex-shrink-0 self-end mb-1">
                            {isFirstInGroup ? (
                              <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
                                {selectedConversation.other_user?.avatar_url ? (
                                  <img src={getOptimizedImageUrl(selectedConversation.other_user.avatar_url, { width: 64, height: 64 })} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <User className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-8" />
                            )}
                          </div>
                        )}

                        <div className={`relative max-w-[75%] px-4 py-3 text-sm font-medium transition-all duration-200 shadow-sm ${
                          isMe 
                            ? `bg-emerald-500 text-white ${
                                isFirstInGroup && isLastInGroup ? 'rounded-[1.5rem] rounded-tr-none' :
                                isFirstInGroup ? 'rounded-[1.5rem] rounded-tr-none rounded-br-lg' :
                                isLastInGroup ? 'rounded-[1.5rem] rounded-tr-lg rounded-br-none' :
                                'rounded-[1.5rem] rounded-tr-lg rounded-br-lg'
                              }`
                            : `bg-white text-gray-800 border border-gray-100 ${
                                isFirstInGroup && isLastInGroup ? 'rounded-[1.5rem] rounded-tl-none' :
                                isFirstInGroup ? 'rounded-[1.5rem] rounded-tl-none rounded-bl-lg' :
                                isLastInGroup ? 'rounded-[1.5rem] rounded-tl-lg rounded-bl-none' :
                                'rounded-[1.5rem] rounded-tl-lg rounded-bl-lg'
                              }`
                        }`}>
                          {msg.image_url && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-black/5 bg-gray-50 max-w-[300px]">
                              <img 
                                src={getOptimizedImageUrl(msg.image_url, { width: 600, height: 450 })} 
                                alt="Attachment" 
                                className="w-full h-auto object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                onClick={() => window.open(msg.image_url, '_blank')}
                              />
                            </div>
                          )}
                          {msg.content.includes('[PRODUCT_IMAGE]') ? (
                            <div className="space-y-2">
                              <p>{msg.content.split('[PRODUCT_IMAGE]')[0]}</p>
                              <div className="rounded-xl overflow-hidden border border-black/5 bg-gray-50">
                                <img 
                                  src={getOptimizedImageUrl(msg.content.split('[PRODUCT_IMAGE]')[1], { width: 400, height: 300 })} 
                                  alt="Product" 
                                  className="w-full h-auto object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                          )}
                          <div className={`flex items-center justify-between gap-4 mt-1.5 ${!isLastInGroup && 'hidden group-hover:flex'}`}>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-bold uppercase tracking-tighter ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && (
                                <div className="text-emerald-100">
                                  {msg.is_read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={() => handleDeleteMessage(msg.id)}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-black/5 ${isMe ? 'text-emerald-100 hover:text-white' : 'text-gray-300 hover:text-red-500'}`}
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {isOtherUserTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex justify-start mt-2"
                    >
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Typing...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 pb-10 md:p-4 bg-white border-t border-gray-100">
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-500/20 shadow-lg">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2 md:gap-3 bg-gray-50 p-1.5 md:p-2 rounded-[2rem] border border-gray-100 focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all">
                <label className="p-2 md:p-3 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-all cursor-pointer active:scale-90">
                  <ImageIcon className="w-5 h-5" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageSelect}
                  />
                </label>
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder={selectedImage ? "Add a caption..." : "Message..."}
                  className="flex-1 bg-transparent border-none py-2 md:py-3 px-1 md:px-2 text-sm font-semibold focus:ring-0 outline-none placeholder:text-gray-400"
                />
                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedImage) || isSending}
                  className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 h-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-emerald-50 rounded-[3rem] flex items-center justify-center animate-pulse">
                <MessageCircle className="w-16 h-16 text-emerald-500" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-gray-50 animate-bounce delay-700">
                <Send className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Select a Chat</h3>
            <p className="text-gray-400 max-w-sm font-bold text-sm leading-relaxed uppercase tracking-widest">
              Pick a conversation from the left to start messaging instantly.
            </p>
            <div className="mt-10 flex items-center gap-4 opacity-20 grayscale">
              <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
              <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
              <div className="w-10 h-10 rounded-xl bg-gray-200"></div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
