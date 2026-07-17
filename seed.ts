import { db } from "./src/db/index.js";
import { adminUsers, barbers, services } from "./src/db/schema.js";
import bcrypt from "bcryptjs";

async function main() {
  const felipeHash = await bcrypt.hash("felipe123", 12);
  const otavioHash = await bcrypt.hash("otavio123", 12);
  const kaioHash = await bcrypt.hash("kaio123", 12);

  await db.insert(adminUsers).values([
    {
      name: "Felipe Coitinho",
      email: "felipe@coitz.com",
      passwordHash: felipeHash,
      phone: "+554391970920",
    },
    {
      name: "Otávio Lavoratto",
      email: "otavio@coitz.com",
      passwordHash: otavioHash,
      phone: "+554391970920",
    },
    {
      name: "Kaio",
      email: "kaioaugustofreire@gmail.com",
      passwordHash: kaioHash,
      phone: "",
    }
  ]);
  
  await db.insert(barbers).values([
    { name: "Felipe Coitinho", bio: "Especialista em degrade", photoUrl: "/felipe.jpg" },
    { name: "Otávio Lavoratto", bio: "Barbeiro premium", photoUrl: "/otavio.png" }
  ]);

  await db.insert(services).values([
    { name: "Corte Cabelo", description: "Corte com acabamento", durationMinutes: 45, price: 3500 },
    { name: "Barba Terapia", description: "Toalha quente e massagem", durationMinutes: 30, price: 2500 }
  ]);
  
  console.log("Database seeded successfully.");
}

main().catch(console.error);
