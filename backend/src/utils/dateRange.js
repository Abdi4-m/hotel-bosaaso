function parseDateRange(checkInValue, checkOutValue) {
  if (typeof checkInValue !== "string" || typeof checkOutValue !== "string") {
    return { error: "Check-in and check-out dates are required" };
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(checkInValue) || !datePattern.test(checkOutValue)) {
    return { error: "Dates must use YYYY-MM-DD format" };
  }

  const checkIn = new Date(`${checkInValue}T00:00:00.000Z`);
  const checkOut = new Date(`${checkOutValue}T00:00:00.000Z`);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkIn.toISOString().slice(0, 10) !== checkInValue || checkOut.toISOString().slice(0, 10) !== checkOutValue || checkOut <= checkIn) {
    return { error: "Check-out must be after check-in" };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (checkIn < today) return { error: "Check-in must be today or later" };
  if (checkOut > getMaxCheckOutDate(checkIn)) {
    return { error: "Check-out cannot be more than 6 months after check-in" };
  }

  return { checkIn, checkOut };
}

function getMaxCheckOutDate(checkIn) {
  const targetMonth = checkIn.getUTCFullYear() * 12 + checkIn.getUTCMonth() + 6;
  const targetYear = Math.floor(targetMonth / 12);
  const targetMonthIndex = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonthIndex, Math.min(checkIn.getUTCDate(), lastDay)));
}

module.exports = { getMaxCheckOutDate, parseDateRange };