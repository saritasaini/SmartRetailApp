export const calculateOfferDetails = (product, quantity = 1) => {
  let finalPrice = product.price;
  let freeQuantity = 0;
  let hasValidOffer = false;
  
  if (product.scheme_type && product.scheme_type !== 'none') {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let isValid = true;
    
    if (product.scheme_start_date) {
      const start = new Date(product.scheme_start_date);
      start.setHours(0, 0, 0, 0);
      if (now < start) isValid = false;
    }
    
    if (product.scheme_end_date) {
      const end = new Date(product.scheme_end_date);
      end.setHours(0, 0, 0, 0);
      if (now > end) isValid = false;
    }
    
    if (isValid) {
      hasValidOffer = true;
      if (product.scheme_type === 'percentage') {
        finalPrice = Math.max(0, product.price * (1 - (product.scheme_value / 100)));
      } else if (product.scheme_type === 'flat') {
        finalPrice = Math.max(0, product.price - product.scheme_value);
      } else if (product.scheme_type === 'bogo' && product.scheme_buy_qty > 0) {
        freeQuantity = Math.floor(quantity / product.scheme_buy_qty) * product.scheme_get_qty;
      }
    }
  }
  
  return {
    hasValidOffer,
    finalPrice: Math.round(finalPrice * 100) / 100,
    freeQuantity,
    totalRequiredStock: quantity + freeQuantity
  };
};
