export interface CategoryAttribute {
  id: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  placeholder?: string;
}

export const CATEGORY_ATTRIBUTES: Record<string, CategoryAttribute[]> = {
  // Electronics / Computers
  'Laptops': [
    { id: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MSI', 'Microsoft', 'Samsung', 'Razer', 'Other'] },
    { id: 'processor', label: 'Processor', type: 'select', options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Apple M1', 'Apple M2', 'Apple M3', 'Other'] },
    { id: 'ram', label: 'RAM', type: 'select', options: ['4GB', '8GB', '12GB', '16GB', '32GB', '64GB', '128GB'] },
    { id: 'storage', label: 'Storage', type: 'select', options: ['128GB SSD', '256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '500GB HDD', '1TB HDD', 'Other'] },
    { id: 'screen_size', label: 'Screen Size', type: 'select', options: ['11 inch', '13 inch', '14 inch', '15 inch', '16 inch', '17 inch'] },
  ],
  'Desktops': [
    { id: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Dell', 'HP', 'Lenovo', 'Custom Build', 'Other'] },
    { id: 'processor', label: 'Processor', type: 'select', options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Other'] },
    { id: 'ram', label: 'RAM', type: 'select', options: ['8GB', '16GB', '32GB', '64GB', '128GB'] },
    { id: 'storage', label: 'Storage', type: 'select', options: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '1TB HDD', '2TB HDD', 'Other'] },
  ],
  // Electronics / Phones
  'Mobile Phones': [
    { id: 'brand', label: 'Brand', type: 'select', options: ['Apple', 'Samsung', 'Google', 'Xiaomi', 'Huawei', 'OnePlus', 'Oppo', 'Vivo', 'Realme', 'Infinix', 'Tecno', 'Other'] },
    { id: 'model_series', label: 'Series', type: 'select', options: ['iPhone 15', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'Galaxy S24', 'Galaxy S23', 'Galaxy S22', 'Galaxy A Series', 'Pixel 8', 'Pixel 7', 'Redmi Note', 'Other'] },
    { id: 'storage', label: 'Storage', type: 'select', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
    { id: 'ram', label: 'RAM', type: 'select', options: ['2GB', '4GB', '6GB', '8GB', '12GB', '16GB'] },
  ],
  // Vehicles / Cars
  'Cars': [
    { id: 'make', label: 'Make', type: 'select', options: ['Toyota', 'Hyundai', 'Suzuki', 'Kia', 'Mercedes-Benz', 'BMW', 'Volkswagen', 'Ford', 'Nissan', 'Mitsubishi', 'Honda', 'Chevrolet', 'Other'] },
    { id: 'body_type', label: 'Body Type', type: 'select', options: ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Coupe', 'Convertible', 'Other'] },
    { id: 'year', label: 'Year', type: 'select', options: Array.from({ length: 30 }, (_, i) => String(2025 - i)) },
    { id: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid'] },
    { id: 'transmission', label: 'Transmission', type: 'select', options: ['Manual', 'Automatic'] },
  ],
  // Real Estate
  'Houses & Apartments for Sale': [
    { id: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Villa', 'Condo', 'Townhouse'] },
    { id: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5+'] },
    { id: 'bathrooms', label: 'Bathrooms', type: 'select', options: ['1', '2', '3', '4+'] },
    { id: 'furnishing', label: 'Furnishing', type: 'select', options: ['Unfurnished', 'Semi-furnished', 'Fully-furnished'] },
  ],
  'Houses & Apartments for Rent': [
    { id: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'House', 'Villa', 'Condo', 'Townhouse'] },
    { id: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['Studio', '1', '2', '3', '4', '5+'] },
    { id: 'bathrooms', label: 'Bathrooms', type: 'select', options: ['1', '2', '3', '4+'] },
    { id: 'furnishing', label: 'Furnishing', type: 'select', options: ['Unfurnished', 'Semi-furnished', 'Fully-furnished'] },
  ],
  'Furniture': [
    { id: 'material', label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Plastic', 'Glass', 'Leather', 'Fabric', 'Other'] },
    { id: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Used', 'Refurbished'] },
  ],
  'Tablets': [
    { id: 'brand', label: 'Brand', type: 'select', options: ['Apple (iPad)', 'Samsung', 'Amazon', 'Lenovo', 'Microsoft', 'Other'] },
    { id: 'storage', label: 'Storage', type: 'select', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
    { id: 'screen_size', label: 'Screen Size', type: 'select', options: ['7-8 inch', '9-10 inch', '11-12 inch', '13+ inch'] },
  ],
  'TVs': [
    { id: 'brand', label: 'Brand', type: 'select', options: ['Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Panasonic', 'Other'] },
    { id: 'screen_size', label: 'Screen Size', type: 'select', options: ['32 inch', '40-43 inch', '50-55 inch', '65 inch', '75+ inch'] },
    { id: 'resolution', label: 'Resolution', type: 'select', options: ['HD', 'Full HD (1080p)', '4K UHD', '8K'] },
  ],
  'Kitchen Appliances': [
    { id: 'brand', label: 'Brand', type: 'select', options: ['Samsung', 'LG', 'Bosch', 'Philips', 'Kenwood', 'Midea', 'Other'] },
    { id: 'type', label: 'Appliance Type', type: 'select', options: ['Fridge', 'Microwave', 'Oven', 'Blender', 'Mixer', 'Dishwasher', 'Other'] },
  ],
  'Watches': [
    { id: 'brand', label: 'Brand', type: 'select', options: ['Rolex', 'Casio', 'Seiko', 'Apple (Watch)', 'Samsung (Galaxy Watch)', 'Fossil', 'Other'] },
    { id: 'movement', label: 'Movement', type: 'select', options: ['Quartz', 'Automatic', 'Manual', 'Smart'] },
  ],
};

// Helper to get attributes by category name or ID
export const getAttributesForCategory = (categoryName: string) => {
  return CATEGORY_ATTRIBUTES[categoryName] || [];
};
