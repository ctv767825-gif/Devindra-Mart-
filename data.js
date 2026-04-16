export const sampleSettings = {
  storeName: 'Devindra Mart',
  tagline: 'Ab ghar tak paaye bazaar jaise rate',
  noticeText: 'Fresh deals today • Minimum order ₹500 • Fast delivery',
  whatsappNumber: '7678256489',
  supportNumber: '7678256489',
  minOrder: 500,
  deliveryRules: [
    { min: 0, max: 999, charge: 50 },
    { min: 1000, max: 2999, charge: 30 },
    { min: 3000, max: 4999, charge: 20 },
    { min: 5000, max: 999999, charge: 10 }
  ],
  storeMapLink: '',
  logoUrl: ''
};

export const sampleCategories = [
  {
    id: 'kirana',
    name_en: 'Kirana',
    name_hi: 'किराना',
    name_hinglish: 'Kirana',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
    support: '7678256489',
    subcategories: ['Atta', 'Rice', 'Oil', 'Snacks']
  },
  {
    id: 'fruits',
    name_en: 'Fruits',
    name_hi: 'फल',
    name_hinglish: 'Fruits',
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=800&auto=format&fit=crop',
    support: '7678256489',
    subcategories: ['Apple', 'Banana', 'Seasonal']
  },
  {
    id: 'vegetables',
    name_en: 'Vegetables',
    name_hi: 'सब्जियां',
    name_hinglish: 'Vegetables',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
    support: '7678256489',
    subcategories: ['Daily Use', 'Leafy', 'Fresh']
  },
  {
    id: 'dairy',
    name_en: 'Dairy',
    name_hi: 'डेयरी',
    name_hinglish: 'Dairy',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=800&auto=format&fit=crop',
    support: '7678256489',
    subcategories: ['Milk', 'Paneer', 'Butter']
  },
  {
    id: 'medical',
    name_en: 'Medical',
    name_hi: 'मेडिकल',
    name_hinglish: 'Medical',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=800&auto=format&fit=crop',
    support: '7678256489',
    subcategories: ['Tablets', 'Syrup', 'First Aid']
  }
];

export const sampleProducts = [
  {id:'p1', name_en:'Wheat Flour', name_hi:'आटा', name_hinglish:'Atta', category:'Kirana', subcategory:'Atta', price:290, image:'https://images.unsplash.com/photo-1603048719539-9ecb4b7a5f62?q=80&w=800&auto=format&fit=crop', badge:'Popular'},
  {id:'p2', name_en:'Basmati Rice', name_hi:'चावल', name_hinglish:'Chawal', category:'Kirana', subcategory:'Rice', price:180, image:'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=800&auto=format&fit=crop', badge:'Top'},
  {id:'p3', name_en:'Mustard Oil', name_hi:'सरसों तेल', name_hinglish:'Sarson Tel', category:'Kirana', subcategory:'Oil', price:210, image:'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=800&auto=format&fit=crop', badge:'Fresh'},
  {id:'p4', name_en:'Apple', name_hi:'सेब', name_hinglish:'Seb', category:'Fruits', subcategory:'Apple', price:120, image:'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?q=80&w=800&auto=format&fit=crop', badge:'Fresh'},
  {id:'p5', name_en:'Banana', name_hi:'केला', name_hinglish:'Kela', category:'Fruits', subcategory:'Banana', price:60, image:'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=800&auto=format&fit=crop', badge:'Value'},
  {id:'p6', name_en:'Potato', name_hi:'आलू', name_hinglish:'Aloo', category:'Vegetables', subcategory:'Daily Use', price:40, image:'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=800&auto=format&fit=crop', badge:'Daily'},
  {id:'p7', name_en:'Tomato', name_hi:'टमाटर', name_hinglish:'Tamatar', category:'Vegetables', subcategory:'Fresh', price:50, image:'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?q=80&w=800&auto=format&fit=crop', badge:'Fresh'},
  {id:'p8', name_en:'Milk', name_hi:'दूध', name_hinglish:'Doodh', category:'Dairy', subcategory:'Milk', price:32, image:'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=800&auto=format&fit=crop', badge:'Daily'},
  {id:'p9', name_en:'Paneer', name_hi:'पनीर', name_hinglish:'Paneer', category:'Dairy', subcategory:'Paneer', price:95, image:'https://images.unsplash.com/photo-1639744210634-53d0bcbb2d18?q=80&w=800&auto=format&fit=crop', badge:'Premium'},
  {id:'p10', name_en:'Paracetamol', name_hi:'पैरासिटामोल', name_hinglish:'Paracetamol', category:'Medical', subcategory:'Tablets', price:25, image:'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=800&auto=format&fit=crop', badge:'Fast'}
];

export const samplePromos = [
  {id:'pr1', type:'image', title:'Today Special', text:'Buy essentials faster with premium delivery', media:'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop'},
  {id:'pr2', type:'image', title:'Fresh Fruits', text:'Fresh arrivals every morning', media:'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=1200&auto=format&fit=crop'},
  {id:'pr3', type:'image', title:'Medical Essentials', text:'Order instantly on WhatsApp', media:'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=1200&auto=format&fit=crop'}
];
