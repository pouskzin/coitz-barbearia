import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { db } from "./src/db/index.js";
import { adminUsers, barbers, services, appointments } from "./src/db/schema.js";
import { eq, and, gte, lt, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { sendWhatsAppMessage } from "./src/lib/whatsapp.js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-default-key-change-in-prod";

async function startServer() {
  const app = express();
  app.set('trust proxy', 1); // Fix for express-rate-limit behind a proxy
  const PORT = 3000;

  // Middlewares
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: process.env.APP_URL || "*", credentials: true }));
  // Basic security headers, but allow inline scripts/styles for dev environment
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // Slightly higher for general API
    message: "Too many requests from this IP, please try again after 15 minutes",
  });
  app.use("/api/", apiLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: "Too many login attempts from this IP, please try again after 15 minutes",
  });

  // Authentication Middleware
  const authenticateAdmin = (req: any, res: any, next: any) => {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.admin = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // ---- API ROUTES ----

  // Setup/Seed initial data
  app.post("/api/setup", async (req, res) => {
    try {
      const existingAdmins = await db.select().from(adminUsers);
      if (existingAdmins.length > 0) {
        return res.status(400).json({ message: "Already setup" });
      }

      // Create Admins (Felipe and Otávio)
      const felipeHash = await bcrypt.hash("felipe123", 12);
      const otavioHash = await bcrypt.hash("otavio123", 12);

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
        }
      ]);

      // Create Barbers
      await db.insert(barbers).values([
        { name: "Felipe Coitinho", bio: "Dono", photoUrl: "" },
        { name: "Otávio Lavoratto", bio: "Sócio", photoUrl: "" }
      ]);

      // Create Services
      await db.insert(services).values([
        { name: "Corte e sobrancelha", description: "Corte com acabamento impecável e design de sobrancelha.", price: 35, durationMinutes: 60 },
        { name: "Corte e barba", description: "Corte e alinhamento de barba com toalha quente.", price: 45, durationMinutes: 60 }
      ]);

      res.json({ message: "Setup completed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Auth: Login
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  app.post("/api/admin/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const users = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
      if (users.length === 0) return res.status(401).json({ error: "Invalid credentials" });

      const user = users[0];
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "12h" });
      
      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 12 * 60 * 60 * 1000 // 12 hours
      });

      res.json({ message: "Logged in successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("admin_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    });
    res.json({ message: "Logged out" });
  });
  
  app.get("/api/admin/me", authenticateAdmin, async (req: any, res: any) => {
     res.json({ user: req.admin });
  });

  // Admin: Change Password
  app.post("/api/admin/change-password", authenticateAdmin, async (req: any, res: any) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: "Preencha ambas as senhas" });
      }

      const users = await db.select().from(adminUsers).where(eq(adminUsers.id, req.admin.id));
      if (users.length === 0) return res.status(404).json({ error: "User not found" });

      const user = users[0];
      const valid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Senha atual incorreta" });

      const newHash = await bcrypt.hash(newPassword, 12);
      await db.update(adminUsers).set({ passwordHash: newHash }).where(eq(adminUsers.id, user.id));

      res.json({ message: "Senha atualizada com sucesso!" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public: Get Barbers
  app.get("/api/barbers", async (req, res) => {
    const allBarbers = await db.select().from(barbers);
    res.json(allBarbers);
  });

  // Public: Get Services
  app.get("/api/services", async (req, res) => {
    const allServices = await db.select().from(services);
    res.json(allServices);
  });

  // Public: Check Availability
  app.get("/api/availability", async (req, res) => {
    const { date, barberId } = req.query;
    if (!date || typeof date !== 'string') return res.status(400).json({ error: "Date is required" });
    
    // Parse date (YYYY-MM-DD)
    const startDate = new Date(`${date}T00:00:00`); // Local time

    try {
      let query = db.select().from(appointments).where(
        and(
          gte(appointments.startTime, `${date}T00:00:00`),
          lt(appointments.startTime, `${date}T23:59:59`),
          or(eq(appointments.status, 'confirmed'), eq(appointments.status, 'completed'))
        )
      );
      
      const booked = await query;
      
      // Filter by barber if provided
      const bookedByBarber = barberId 
        ? booked.filter(a => a.barberId === Number(barberId))
        : booked;

      // Available slots logic (9:00 to 20:00, slots of 1 hour)
      // Sat is 9 to 18. Sun is closed.
      const dayOfWeek = startDate.getDay();
      if (dayOfWeek === 0) return res.json({ availableSlots: [] }); // Sunday closed
      
      const closingHour = dayOfWeek === 6 ? 18 : 20;
      
      const allBarbers = barberId 
        ? await db.select().from(barbers).where(eq(barbers.id, Number(barberId)))
        : await db.select().from(barbers);

      const availableSlots = [];
      
      for (let hour = 9; hour < closingHour; hour++) {
        for (const b of allBarbers) {
          const slotTimeString = `${date}T${hour.toString().padStart(2, '0')}:00:00`;
          
          const isBooked = booked.some(a => a.barberId === b.id && a.startTime === slotTimeString);
          
          if (!isBooked) {
             availableSlots.push({ time: slotTimeString, barberId: b.id });
          }
        }
      }
      
      res.json({ availableSlots });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Public: Create Appointment
  const appointmentSchema = z.object({
    clientName: z.string().min(2),
    clientPhone: z.string().min(10),
    clientEmail: z.string().email().optional().or(z.literal("")),
    barberId: z.number(),
    serviceId: z.number(),
    startTime: z.string(), // "YYYY-MM-DDTHH:mm:00"
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const data = appointmentSchema.parse(req.body);
      
      // Fetch service for price
      const serviceData = await db.select().from(services).where(eq(services.id, data.serviceId));
      if (serviceData.length === 0) return res.status(400).json({ error: "Invalid service" });
      const price = serviceData[0].price;

      const localStartTime = data.startTime.replace('Z', '').substring(0, 19);
      
      const startTimeObj = new Date(localStartTime);
      const durationMs = (serviceData[0].durationMinutes || 60) * 60 * 1000;
      const endTimeObj = new Date(startTimeObj.getTime() + durationMs);
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const localEndTime = `${endTimeObj.getFullYear()}-${pad(endTimeObj.getMonth()+1)}-${pad(endTimeObj.getDate())}T${pad(endTimeObj.getHours())}:${pad(endTimeObj.getMinutes())}:00`;

      // Check conflict
      const conflicts = await db.select().from(appointments).where(
        and(
          eq(appointments.barberId, data.barberId),
          eq(appointments.startTime, localStartTime),
          or(eq(appointments.status, 'confirmed'), eq(appointments.status, 'completed'))
        )
      );

      if (conflicts.length > 0) return res.status(400).json({ error: "Time slot already booked" });

      await db.insert(appointments).values({
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail || null,
        barberId: data.barberId,
        serviceId: data.serviceId,
        startTime: localStartTime,
        endTime: localEndTime,
        totalPrice: price,
        status: "confirmed"
      });

      // WhatsApp confirmation
      const formattedDate = format(startTimeObj, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
      const message = `Olá, ${data.clientName}!\n\nSeu agendamento na *Coitz Barbearia* está confirmado para:\n📅 ${formattedDate}\n\n📍 Av. Dr. João de Aguiar, 500 - Jacarezinho/PR\n\nAté lá!`;
      await sendWhatsAppMessage(data.clientPhone, message);

      res.json({ message: "Appointment confirmed" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.issues });
      }
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Get Appointments
  app.get("/api/admin/appointments", authenticateAdmin, async (req, res) => {
    try {
      const allAppointments = await db.select().from(appointments).orderBy(appointments.startTime);
      res.json(allAppointments);
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Update Appointment Status
  app.patch("/api/admin/appointments/:id", authenticateAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const id = parseInt(req.params.id);
      if (!['confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      await db.update(appointments)
        .set({ status })
        .where(eq(appointments.id, id));

      if (status === 'completed') {
        const aptInfo = await db.select().from(appointments).where(eq(appointments.id, id));
        if (aptInfo.length > 0 && aptInfo[0].clientPhone) {
          const msg = `Olá, ${aptInfo[0].clientName}!\n\nAgradecemos a preferência pela *Coitz Barbearia*. Volte sempre!`;
          await sendWhatsAppMessage(aptInfo[0].clientPhone, msg);
        }
      }

      res.json({ message: "Status updated" });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
