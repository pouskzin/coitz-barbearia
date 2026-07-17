import { pgTable, serial, text, integer, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const barbers = pgTable('barbers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  bio: text('bio'),
  photoUrl: text('photo_url'),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  price: integer('price').notNull(),
  active: boolean('active').notNull().default(true),
});

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone').notNull(),
  clientEmail: text('client_email'),
  barberId: integer('barber_id').notNull().references(() => barbers.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
  status: text('status', { enum: ['confirmed', 'completed', 'cancelled', 'no_show'] }).notNull().default('confirmed'),
  startTime: text('start_time').notNull(), 
  endTime: text('end_time').notNull(),
  totalPrice: integer('total_price').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
