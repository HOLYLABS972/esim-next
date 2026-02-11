// Fast cached countries for immediate loading
// This list contains the most popular countries with their basic info
// The full list will be loaded from API in the background

export const CACHED_COUNTRIES = [
  {
    id: "US",
    code: "US", 
    name: "United States",
    flag: "https://cdn.airalo.com/images/600de234-ec12-4e1f-b793-c70860e4545a.png",
    flagEmoji: "🇺🇸",
    region: "North America",
    continent: "North America"
  },
  {
    id: "GB",
    code: "GB",
    name: "United Kingdom", 
    flag: "https://cdn.airalo.com/images/38db53aa-6e44-4e65-a106-9465b8e25182.png",
    flagEmoji: "🇬🇧",
    region: "Europe",
    continent: "Europe"
  },
  {
    id: "DE",
    code: "DE",
    name: "Germany",
    flag: "https://cdn.airalo.com/images/9ca59255-4cf9-4f8b-8903-4f8ea02707b4.png", 
    flagEmoji: "🇩🇪",
    region: "Europe",
    continent: "Europe"
  },
  {
    id: "FR",
    code: "FR",
    name: "France",
    flag: "https://cdn.airalo.com/images/9753dedb-d495-47cf-b6e4-82e555564743.png",
    flagEmoji: "🇫🇷", 
    region: "Europe",
    continent: "Europe"
  },
  {
    id: "ES",
    code: "ES",
    name: "Spain",
    flag: "https://cdn.airalo.com/images/c9c87a09-69f5-4c5c-8d20-633539ab5aca.png",
    flagEmoji: "🇪🇸",
    region: "Europe", 
    continent: "Europe"
  },
  {
    id: "IT",
    code: "IT",
    name: "Italy",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇮🇹",
    region: "Europe",
    continent: "Europe"
  },
  {
    id: "CA",
    code: "CA", 
    name: "Canada",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇨🇦",
    region: "North America",
    continent: "North America"
  },
  {
    id: "AU",
    code: "AU",
    name: "Australia", 
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇦🇺",
    region: "Oceania",
    continent: "Oceania"
  },
  {
    id: "JP",
    code: "JP",
    name: "Japan",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇯🇵",
    region: "Asia",
    continent: "Asia"
  },
  {
    id: "KR",
    code: "KR",
    name: "South Korea",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png", 
    flagEmoji: "🇰🇷",
    region: "Asia",
    continent: "Asia"
  },
  {
    id: "CN",
    code: "CN",
    name: "China",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇨🇳",
    region: "Asia", 
    continent: "Asia"
  },
  {
    id: "IN",
    code: "IN",
    name: "India",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇮🇳",
    region: "Asia",
    continent: "Asia"
  },
  {
    id: "BR",
    code: "BR",
    name: "Brazil",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇧🇷",
    region: "South America",
    continent: "South America"
  },
  {
    id: "MX",
    code: "MX", 
    name: "Mexico",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇲🇽",
    region: "North America",
    continent: "North America"
  },
  {
    id: "RU",
    code: "RU",
    name: "Russia",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇷🇺",
    region: "Europe/Asia",
    continent: "Europe"
  },
  {
    id: "ZA",
    code: "ZA",
    name: "South Africa",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇿🇦", 
    region: "Africa",
    continent: "Africa"
  },
  {
    id: "EG",
    code: "EG",
    name: "Egypt",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇪🇬",
    region: "Africa",
    continent: "Africa"
  },
  {
    id: "AE",
    code: "AE",
    name: "United Arab Emirates",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇦🇪",
    region: "Middle East",
    continent: "Asia"
  },
  {
    id: "SA",
    code: "SA",
    name: "Saudi Arabia", 
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇸🇦",
    region: "Middle East",
    continent: "Asia"
  },
  {
    id: "TR",
    code: "TR",
    name: "Turkey",
    flag: "https://cdn.airalo.com/images/22b46518-b4ef-4e45-9865-8f9253ff9a28.png",
    flagEmoji: "🇹🇷",
    region: "Europe/Asia",
    continent: "Europe"
  }
];

// Function to get flag emoji from country code
export const getFlagEmoji = (countryCode) => {
  const flagEmojiMap = {
    'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷', 'ES': '🇪🇸',
    'IT': '🇮🇹', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵', 'KR': '🇰🇷',
    'CN': '🇨🇳', 'IN': '🇮🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'RU': '🇷🇺',
    'ZA': '🇿🇦', 'EG': '🇪🇬', 'AE': '🇦🇪', 'SA': '🇸🇦', 'TR': '🇹🇷',
    'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭', 'AT': '🇦🇹', 'SE': '🇸🇪',
    'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿',
    'HU': '🇭🇺', 'GR': '🇬🇷', 'PT': '🇵🇹', 'IE': '🇮🇪', 'IS': '🇮🇸',
    'TH': '🇹🇭', 'SG': '🇸🇬', 'MY': '🇲🇾', 'ID': '🇮🇩', 'PH': '🇵🇭',
    'VN': '🇻🇳', 'HK': '🇭🇰', 'TW': '🇹🇼', 'NZ': '🇳🇿', 'AR': '🇦🇷',
    'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪', 'UY': '🇺🇾', 'EC': '🇪🇨'
  };
  
  return flagEmojiMap[countryCode] || '🏳️';
};
