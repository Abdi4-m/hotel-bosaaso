function getOrderTaxRate() {
  const taxRate = Number(process.env.ORDER_TAX_RATE ?? 0.0685);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    const error = new Error("Order tax rate configuration is invalid");
    error.status = 500;
    throw error;
  }
  return taxRate;
}

module.exports = { getOrderTaxRate };
