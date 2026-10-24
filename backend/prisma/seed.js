require("dotenv").config();

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { getAdminCredentials } = require("./seedConfig");

const prisma = new PrismaClient();

const foods = [
  ["Classic Cheeseburger", "Grilled beef, cheddar, lettuce, tomato, and house sauce.", 14.5, "photo-1568901346375-23c9450c58cd"],
  ["Pizza", "San Marzano tomato, mozzarella, and fresh basil.", 16, "photo-1574071318508-1cdbab80d002"],
  ["Grilled Salmon", "Atlantic salmon with lemon butter and seasonal greens.", 24, "photo-1467003909585-2f8a72700288"],
  ["Caesar Salad", "Romaine, parmesan, sourdough croutons, and Caesar dressing.", 12, "photo-1546793665-c74683f339c1"],
  ["Chicken Alfredo", "Fettuccine in parmesan cream with grilled chicken.", 19, "photo-1645112411341-6c4fd023714a"],
  ["Mushroom Risotto", "Slow-cooked arborio rice, wild mushrooms, and herbs.", 18, "photo-1476124369491-e7addf5db371"],
  ["Fish and Chips", "Crisp battered cod with fries and tartar sauce.", 17, "photo-1579208030886-b937da0925dc"],
  ["Beef Tacos", "Three soft tacos with braised beef, salsa, and lime.", 15, "photo-1551504734-5ee1c4a1479b"],
  ["Vegetable Curry", "Coconut curry with seasonal vegetables and basmati rice.", 16, "photo-1603894584373-5ac82b2ae398"],
  ["Club Sandwich", "Roast chicken, bacon, egg, tomato, and toasted bread.", 14, "photo-1528735602780-2552fd46c7af"],
  ["Lobster Roll", "Chilled lobster, lemon mayo, and a toasted brioche roll.", 26, "photo-1559737558-2f5a35f4523b"],
  ["BBQ Ribs", "Slow-cooked pork ribs glazed with smoky house barbecue.", 25, "photo-1544025162-d76694265947"],
  ["Pesto Gnocchi", "Potato gnocchi tossed with basil pesto and parmesan.", 17, "photo-1551183053-bf91a1d81141"],
  ["Steak Frites", "Sirloin steak with herb butter and golden fries.", 29, "photo-1546833999-b9f581a1996d"],
  ["Shrimp Linguine", "Garlic shrimp, linguine, cherry tomato, and parsley.", 22, "photo-1563379091339-03246963d51a"],
  ["Falafel Plate", "Herb falafel, hummus, pickled vegetables, and pita.", 15, "photo-1547058881-aa0edd92aab3"],
  ["French Onion Soup", "Caramelized onion soup topped with gruyere toast.", 10, "photo-1547592180-85f173990554"],
  ["Four Cheese Pasta", "Penne with a rich blend of four cheeses.", 18, "photo-1473093295043-cdd812d0e601"],
  ["Crispy Chicken Wrap", "Buttermilk chicken, slaw, and chipotle dressing.", 14, "photo-1606755962773-d324e0a13086"],
  ["Greek Salad", "Tomato, cucumber, olives, feta, and oregano.", 13, "photo-1551248429-40975aa4de74"],
  ["Pancake Stack", "Fluffy pancakes with berries and maple syrup.", 12, "photo-1528207776546-365bb710ee93"],
  ["Eggs Benedict", "Poached eggs, smoked ham, and hollandaise on brioche.", 15, "photo-1533089860892-a7c6f0a88666"],
  ["Avocado Toast", "Smashed avocado, sourdough, chili, and poached egg.", 13, "photo-1525351484163-7529414344d8"],
  ["Chocolate Lava Cake", "Warm chocolate cake with a molten center.", 9, "photo-1606313564200-e75d5e30476c"],
  ["New York Cheesecake", "Baked vanilla cheesecake with berry compote.", 9, "photo-1533134242443-d4fd215305ad"],
  ["Classic Tiramisu", "Espresso-soaked sponge, mascarpone, and cocoa.", 10, "photo-1571877227200-a0d98ea607e9"],
  ["Seasonal Fruit Bowl", "Fresh-cut seasonal fruit with mint.", 8, "photo-1490474418585-ba9bad8fd0ea"],
  ["Vanilla Crème Brûlée", "Vanilla custard with a crisp caramelized top.", 9, "photo-1470324161839-ce2bb6fa6bc3"],
  ["Apple Tart", "Warm caramelized apple tart with vanilla cream.", 9, "photo-1519915028121-7d3463d20b13"],
  ["Berry Smoothie", "Blended strawberries, blueberries, and yogurt.", 7, "photo-1505252585461-04db1eb84625"],
];

const roomTypes = ["STANDARD", "DELUXE", "DELUXE", "DELUXE", "FAMILY"];
const rooms = Array.from({ length: 30 }, (_, index) => {
  const roomNumber = String(101 + index);
  const type = roomTypes[index % roomTypes.length];
  return {
    id: `seed-room-${String(index + 1).padStart(2, "0")}`,
    roomNumber,
    name: `${type === "FAMILY" ? "Family" : type === "STANDARD" ? "Standard" : "Deluxe"} Room ${roomNumber}`,
    type,
    hasEnsuiteBathroom: index % 3 !== 0,
    pricePerNight: [95, 145, 220, 15, 170][index % roomTypes.length],
    isBooked: false,
    description: `${type === "FAMILY" ? "A spacious family room" : "A thoughtfully appointed guest room"} with a quiet view and a comfortable place to unwind.`,
    image: `https://images.unsplash.com/photo-${[
      "1611892440504-42a792e24d32", "1618221195710-dd6b41faaea6", "1616486338812-3dadae4b4ace",
      "1616594039964-ae9021a400a0", "1615874694520-474822394e73",
    ][index % 5]}?auto=format&fit=crop&w=1200&q=80`,
  };
});

async function main() {
  const { adminEmail, adminPassword } = getAdminCredentials();
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "1Hotel Administrator", password: hashedPassword, role: "ADMIN" },
    create: {
      name: " 1Hotel Administrator",
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  for (const [index, [title, description, price, imageId]] of foods.entries()) {
    await prisma.food.upsert({
      where: { id: `seed-food-${String(index + 1).padStart(2, "0")}` },
      update: { title, description, price, image: `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1200&q=80` },
      create: {
        id: `seed-food-${String(index + 1).padStart(2, "0")}`,
        title,
        description,
        price,
        image: `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1200&q=80`,
        isAvailable: true,
      },
    });
  }

  for (const room of rooms) {
    const { id, isBooked, ...roomDetails } = room;
    await prisma.room.upsert({
      where: { id },
      update: roomDetails,
      create: { id, ...roomDetails, isBooked },
    });
  }

  console.log(`Seeded ${foods.length} food items and ${rooms.length} rooms. Admin: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });