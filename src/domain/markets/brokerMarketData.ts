export interface BrokerMarketQuote {
  id: string;
  country: 'UK' | 'FR' | 'NL' | 'DE' | 'DK' | 'AIB';
  class: 'RGGO' | 'GO';
  feedstock: string;
  vintage: string;
  certified: string;
  subsidized: 'Subsidised' | 'Unsubsidised';
  ciScore: string;
  bidPrice: string; // e.g. "£16.30", "€147.00", "Buyer", or empty
  offerPrice: string; // e.g. "£25.00", "€50.00", "Seller", or empty
  bidVolume: string; // e.g. "10GWh", "35GWh"
  offerVolume: string; // e.g. "15GWh", "30GWh"
  currency: 'GBP' | 'EUR';
  numericBidEurMwh?: number | null;
  numericOfferEurMwh?: number | null;
  highlight?: boolean;
}

/**
 * Initial dataset seeded exactly from the Pan-European Biomethane Markets broker sheet
 */
export const INITIAL_BROKER_QUOTES: BrokerMarketQuote[] = [
  // UK RGGO
  { id: 'uk_1', country: 'UK', class: 'RGGO', feedstock: 'Waste', vintage: '2026', certified: 'Certified (ISCC)', subsidized: 'Subsidised', ciScore: '<18gCO2/MJ', bidPrice: '', offerPrice: '£25.00', bidVolume: '', offerVolume: '15GWh', currency: 'GBP', numericOfferEurMwh: 29.38 },
  { id: 'uk_2', country: 'UK', class: 'RGGO', feedstock: 'Crop', vintage: '2027', certified: 'Certified (ISCC)', subsidized: 'Subsidised', ciScore: '<30gCO2/MJ', bidPrice: '', offerPrice: '£21.20', bidVolume: '', offerVolume: '30GWh', currency: 'GBP', numericOfferEurMwh: 24.91 },
  { id: 'uk_3', country: 'UK', class: 'RGGO', feedstock: 'Crop', vintage: '2026', certified: 'Certified (ISCC)', subsidized: 'Subsidised', ciScore: '<20gCO2/MJ', bidPrice: '', offerPrice: '£19.00', bidVolume: '', offerVolume: '30GWh', currency: 'GBP', numericOfferEurMwh: 22.33 },
  { id: 'uk_4', country: 'UK', class: 'RGGO', feedstock: 'Waste', vintage: '2025', certified: 'Certified (A9A)', subsidized: 'Subsidised', ciScore: '<-20gCO2/MJ', bidPrice: '', offerPrice: '£23.65', bidVolume: '', offerVolume: '10GWh', currency: 'GBP', numericOfferEurMwh: 27.79 },
  { id: 'uk_5', country: 'UK', class: 'RGGO', feedstock: 'Crop', vintage: '2025', certified: 'Certified (ISCC)', subsidized: 'Subsidised', ciScore: '<10gCO2/MJ', bidPrice: '£16.30', offerPrice: '', bidVolume: '10GWh', offerVolume: '', currency: 'GBP', numericBidEurMwh: 19.15 },
  { id: 'uk_6', country: 'UK', class: 'RGGO', feedstock: 'Waste', vintage: '2024', certified: 'Certified (ISCC)', subsidized: 'Subsidised', ciScore: '<20gCO2/MJ', bidPrice: '', offerPrice: '£17.20', bidVolume: '', offerVolume: '15GWh', currency: 'GBP', numericOfferEurMwh: 20.21 },
  { id: 'uk_7', country: 'UK', class: 'RGGO', feedstock: 'Waste', vintage: 'H224', certified: 'Certified (ISCC)', subsidized: 'Subsidised', ciScore: '<12gCO2/MJ', bidPrice: '', offerPrice: '', bidVolume: '', offerVolume: '', currency: 'GBP' },
  { id: 'uk_8', country: 'UK', class: 'RGGO', feedstock: 'Crop', vintage: '2024', certified: 'Certified (ISCC)', subsidized: 'Subsidised', ciScore: '<10gCO2/MJ', bidPrice: '£15.25', offerPrice: '£15.90', bidVolume: '10GWh', offerVolume: '15GWh', currency: 'GBP', numericBidEurMwh: 17.92, numericOfferEurMwh: 18.68 },
  { id: 'uk_9', country: 'UK', class: 'RGGO', feedstock: 'Waste', vintage: 'H227', certified: 'Uncertified', subsidized: 'Subsidised', ciScore: '', bidPrice: 'Buyer', offerPrice: '£20.90', bidVolume: '10GWh', offerVolume: '10GWh', currency: 'GBP', numericOfferEurMwh: 24.56 },
  { id: 'uk_10', country: 'UK', class: 'RGGO', feedstock: 'Crop', vintage: '2025', certified: 'Uncertified', subsidized: 'Subsidised', ciScore: '', bidPrice: '£15.90', offerPrice: '', bidVolume: '', offerVolume: '10GWh', currency: 'GBP', numericBidEurMwh: 18.68 },
  { id: 'uk_11', country: 'UK', class: 'RGGO', feedstock: 'Waste', vintage: '2026', certified: 'Uncertified', subsidized: 'Subsidised', ciScore: '', bidPrice: '£17.90', offerPrice: '', bidVolume: '10GWh', offerVolume: '10GWh', currency: 'GBP', numericBidEurMwh: 21.03 },

  // FR GO
  { id: 'fr_1', country: 'FR', class: 'GO', feedstock: 'Waste/Crop mix (A9a)', vintage: 'H226', certified: 'Certified (ETS)', subsidized: 'Subsidised', ciScore: '<16gCO2/MJ', bidPrice: '€ 26.50', offerPrice: '', bidVolume: '35GWh', offerVolume: '', currency: 'EUR', numericBidEurMwh: 26.50 },
  { id: 'fr_2', country: 'FR', class: 'GO', feedstock: 'Waste', vintage: 'H225', certified: 'Certified (ETS)', subsidized: 'Subsidised', ciScore: '<20gCO2/MJ', bidPrice: '', offerPrice: 'Seller', bidVolume: '', offerVolume: '20GWh', currency: 'EUR' },
  { id: 'fr_3', country: 'FR', class: 'GO', feedstock: 'Mix', vintage: 'H225', certified: 'Certified (Non-ETS)', subsidized: 'Subsidised', ciScore: '<20gCO2/MJ', bidPrice: '', offerPrice: '', bidVolume: '', offerVolume: '', currency: 'EUR' },
  { id: 'fr_4', country: 'FR', class: 'GO', feedstock: 'Mix', vintage: '2027', certified: 'Uncertified', subsidized: 'Subsidised', ciScore: '', bidPrice: 'Buyer', offerPrice: '', bidVolume: '10GWh', offerVolume: '', currency: 'EUR' },
  { id: 'fr_5', country: 'FR', class: 'GO', feedstock: 'Mix', vintage: '2026', certified: 'Uncertified', subsidized: 'Subsidised', ciScore: '', bidPrice: 'Buyer', offerPrice: '€ 20.50', bidVolume: '20GWh', offerVolume: '10GWh', currency: 'EUR', numericOfferEurMwh: 20.50 },
  { id: 'fr_6', country: 'FR', class: 'GO', feedstock: 'Mix', vintage: 'H225', certified: 'Uncertified', subsidized: 'Subsidised', ciScore: '', bidPrice: 'Buyer', offerPrice: '', bidVolume: '25GWh', offerVolume: '', currency: 'EUR' },

  // NL GO
  { id: 'nl_1', country: 'NL', class: 'GO', feedstock: 'Waste', vintage: '2026', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '<0gCO2/MJ', bidPrice: 'Buyer', offerPrice: '€ 50.00', bidVolume: '10GWh', offerVolume: '25GWh', currency: 'EUR', numericOfferEurMwh: 50.00 },
  { id: 'nl_2', country: 'NL', class: 'GO', feedstock: 'Waste', vintage: '2026', certified: 'Certified', subsidized: 'Subsidised', ciScore: '<-17gCO2/MJ', bidPrice: 'Buyer', offerPrice: '€ 36.00', bidVolume: '10GWh', offerVolume: '10GWh', currency: 'EUR', numericOfferEurMwh: 36.00, highlight: true },
  { id: 'nl_3', country: 'NL', class: 'GO', feedstock: 'Waste', vintage: '2026', certified: 'Certified', subsidized: 'Subsidised', ciScore: '<-14gCO2/MJ', bidPrice: 'Buyer', offerPrice: '€ 34.00', bidVolume: '10GWh', offerVolume: '20GWh', currency: 'EUR', numericOfferEurMwh: 34.00, highlight: true },
  { id: 'nl_4', country: 'NL', class: 'GO', feedstock: 'Waste', vintage: '2026', certified: 'Certified', subsidized: 'Subsidised', ciScore: '<0gCO2/MJ', bidPrice: '', offerPrice: '€ 30.00', bidVolume: '', offerVolume: '10GWh', currency: 'EUR', numericOfferEurMwh: 30.00, highlight: true },
  { id: 'nl_5', country: 'NL', class: 'GO', feedstock: 'Waste', vintage: 'Q425', certified: 'Certified', subsidized: 'Subsidised', ciScore: '<20gCO2/MJ', bidPrice: '', offerPrice: '€ 30.00', bidVolume: '', offerVolume: '15GWh', currency: 'EUR', numericOfferEurMwh: 30.00 },

  // DE GO
  { id: 'de_1', country: 'DE', class: 'GO', feedstock: 'Manure + Physical Gas', vintage: 'H226', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '-100gCO2/MJ', bidPrice: '€ 147.00', offerPrice: 'Seller', bidVolume: '10GWh', offerVolume: '10GWh', currency: 'EUR', numericBidEurMwh: 147.00, highlight: true },
  { id: 'de_2', country: 'DE', class: 'GO', feedstock: 'Waste', vintage: '2026', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '<20gCO2/MJ', bidPrice: '€ 35.00', offerPrice: '€ 44.00', bidVolume: '10GWh', offerVolume: '10GWh', currency: 'EUR', numericBidEurMwh: 35.00, numericOfferEurMwh: 44.00 },
  { id: 'de_3', country: 'DE', class: 'GO', feedstock: 'Manure + Physical Gas', vintage: 'H127', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '<-92gCO2/MJ', bidPrice: '€ 141.00', offerPrice: '€ 148.00', bidVolume: '15GWh', offerVolume: '15GWh', currency: 'EUR', numericBidEurMwh: 141.00, numericOfferEurMwh: 148.00, highlight: true },

  // DK GO
  { id: 'dk_1', country: 'DK', class: 'GO', feedstock: 'Manure/Waste', vintage: '2026', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '<-100gCO2/MJ', bidPrice: 'Buyer', offerPrice: '', bidVolume: '20GWh', offerVolume: '', currency: 'EUR' },
  { id: 'dk_2', country: 'DK', class: 'GO', feedstock: 'Manure/Waste', vintage: '2026', certified: 'Certified', subsidized: 'Subsidised', ciScore: '<-50gCO2/MJ', bidPrice: 'Buyer', offerPrice: '', bidVolume: '30GWh', offerVolume: '', currency: 'EUR' },
  { id: 'dk_3', country: 'DK', class: 'GO', feedstock: 'Manure/Waste', vintage: '2027', certified: 'Certified', subsidized: 'Subsidised', ciScore: '<-70gCO2/MJ', bidPrice: '', offerPrice: 'Seller', bidVolume: '', offerVolume: '10GWh', currency: 'EUR', highlight: true },
  { id: 'dk_4', country: 'DK', class: 'GO', feedstock: 'Manure/Waste', vintage: 'H226', certified: 'Certified', subsidized: 'Subsidised', ciScore: '<-50gCO2/MJ', bidPrice: '€ 44.00', offerPrice: 'Seller', bidVolume: '20GWh', offerVolume: '20GWh', currency: 'EUR', numericBidEurMwh: 44.00, highlight: true },
  { id: 'dk_5', country: 'DK', class: 'GO', feedstock: 'Waste', vintage: '2027', certified: 'Certified', subsidized: 'Subsidised', ciScore: '<20gCO2', bidPrice: '', offerPrice: '€ 37.00', bidVolume: '', offerVolume: '10GWh', currency: 'EUR', numericOfferEurMwh: 37.00 },
  { id: 'dk_6', country: 'DK', class: 'GO', feedstock: 'Waste', vintage: '2026', certified: 'Uncertified', subsidized: 'Subsidised', ciScore: '', bidPrice: '', offerPrice: 'Seller', bidVolume: '', offerVolume: '10GWh', currency: 'EUR' },
  { id: 'dk_7', country: 'DK', class: 'GO', feedstock: 'Waste', vintage: '2026', certified: 'Uncertified', subsidized: 'Subsidised', ciScore: '', bidPrice: '€ 22.50', offerPrice: '', bidVolume: '10GWh', offerVolume: '', currency: 'EUR', numericBidEurMwh: 22.50 },

  // AIB GO
  { id: 'aib_1', country: 'AIB', class: 'GO', feedstock: 'Manure', vintage: '2027', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '<-100gCO2/MJ', bidPrice: '€ 126.00', offerPrice: '', bidVolume: '15GWh', offerVolume: '', currency: 'EUR', numericBidEurMwh: 126.00, highlight: true },
  { id: 'aib_2', country: 'AIB', class: 'GO', feedstock: 'Manure', vintage: '2027/28', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '<-100gCO2/MJ', bidPrice: 'Buyer', offerPrice: '€ 126.00', bidVolume: '', offerVolume: '30-50GWh', currency: 'EUR', numericOfferEurMwh: 126.00, highlight: true },
  { id: 'aib_3', country: 'AIB', class: 'GO', feedstock: 'Waste/Crop', vintage: '2027', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '<-5gCO2/MJ', bidPrice: '', offerPrice: 'Seller', bidVolume: '', offerVolume: '10GWh', currency: 'EUR' },
  { id: 'aib_4', country: 'AIB', class: 'GO', feedstock: 'Manure/Waste', vintage: 'Q426', certified: 'Certified', subsidized: 'Unsubsidised', ciScore: '<-25gCO2/MJ', bidPrice: 'Buyer', offerPrice: '', bidVolume: '20-30GWh', offerVolume: '', currency: 'EUR' },
];
