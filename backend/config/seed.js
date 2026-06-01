require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');

const User = require('../models/User');
const Branch = require('../models/Branch');
const Product = require('../models/Product');
const Ingredient = require('../models/Ingredient');
const Recipe = require('../models/Recipe');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const Expense = require('../models/Expense');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const Shift = require('../models/Shift');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database with Tunisian Localized Data...');

  await Promise.all([
    User.deleteMany(), Branch.deleteMany(), Product.deleteMany(),
    Ingredient.deleteMany(), Recipe.deleteMany(), Customer.deleteMany(),
    Employee.deleteMany(), Expense.deleteMany(), Order.deleteMany(), Table.deleteMany(),
    Supplier.deleteMany(), PurchaseOrder.deleteMany(), Shift.deleteMany()
  ]);

  // Branches in Tunis and Sfax
  const [branch1, branch2] = await Branch.insertMany([
    { name: 'CoffeeMaster - Tunis (Lac 2)', address: 'Rue du Lac Biwa, Les Berges du Lac 2, Tunis', phone: '71-000-001', email: 'lac2@coffeemaster.tn', openTime: '07:00', closeTime: '22:00', currency: 'TND' },
    { name: 'CoffeeMaster - Sfax', address: 'Avenue de la Liberté, Sfax', phone: '74-000-002', email: 'sfax@coffeemaster.tn', openTime: '08:00', closeTime: '21:00', currency: 'TND' },
  ]);

  // Users with Tunisian emails
  const pass = await bcrypt.hash('password123', 12);
  const [admin, manager, cashier, barista] = await User.insertMany([
    { name: 'Adem Admin', email: 'admin@coffeemaster.tn', password: pass, role: 'admin', branch: branch1._id, phone: '22000001' },
    { name: 'Sara Manager', email: 'manager@coffeemaster.tn', password: pass, role: 'manager', branch: branch1._id, phone: '22000002' },
    { name: 'Karim Cashier', email: 'cashier@coffeemaster.tn', password: pass, role: 'cashier', branch: branch1._id, phone: '22000003' },
    { name: 'Lina Barista', email: 'barista@coffeemaster.tn', password: pass, role: 'barista', branch: branch1._id, phone: '22000004' },
  ]);

  // Update manager for branch
  await Branch.findByIdAndUpdate(branch1._id, { manager: manager._id });

  // Ingredients priced realistically in TND
  const ingredients = await Ingredient.insertMany([
    { name: 'Coffee Beans', unit: 'kg', quantity: 15, minQuantity: 3, costPerUnit: 25.0, branch: branch1._id, expirationDate: new Date(Date.now() + 90*24*60*60*1000) },
    { name: 'Whole Milk', unit: 'L', quantity: 20, minQuantity: 5, costPerUnit: 1.45, branch: branch1._id, expirationDate: new Date(Date.now() + 5*24*60*60*1000) },
    { name: 'Sugar', unit: 'kg', quantity: 10, minQuantity: 2, costPerUnit: 1.2, branch: branch1._id },
    { name: 'Vanilla Syrup', unit: 'L', quantity: 3, minQuantity: 1, costPerUnit: 15.0, branch: branch1._id },
    { name: 'Cocoa Powder', unit: 'g', quantity: 1000, minQuantity: 200, costPerUnit: 0.015, branch: branch1._id },
    { name: 'Green Tea Leaves', unit: 'g', quantity: 500, minQuantity: 100, costPerUnit: 0.02, branch: branch1._id },
    { name: 'Bread', unit: 'pcs', quantity: 60, minQuantity: 10, costPerUnit: 0.25, branch: branch1._id, expirationDate: new Date(Date.now() + 2*24*60*60*1000) },
    { name: 'Chocolate', unit: 'g', quantity: 2000, minQuantity: 500, costPerUnit: 0.01, branch: branch1._id },
    { name: 'Cream', unit: 'ml', quantity: 5000, minQuantity: 1000, costPerUnit: 0.005, branch: branch1._id },
    { name: 'Espresso Shots', unit: 'ml', quantity: 8000, minQuantity: 2000, costPerUnit: 0.05, branch: branch1._id },
  ]);

  const [beans, milk, sugar, vanilla, cocoa, tea, bread, choco, cream, espresso] = ingredients;

  // Products priced realistically in TND
  const products = await Product.insertMany([
    { name: 'Espresso', category: 'Coffee', price: 2.500, cost: 0.600, branch: branch1._id, isAvailable: true, preparationTime: 3, image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=150&auto=format&fit=crop&q=80' },
    { name: 'Cappuccino', category: 'Coffee', price: 3.500, cost: 0.900, branch: branch1._id, isAvailable: true, preparationTime: 5, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=150&auto=format&fit=crop&q=80' },
    { name: 'Latte', category: 'Coffee', price: 4.000, cost: 1.000, branch: branch1._id, isAvailable: true, preparationTime: 5, image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=150&auto=format&fit=crop&q=80' },
    { name: 'Mocha', category: 'Coffee', price: 4.500, cost: 1.100, branch: branch1._id, isAvailable: true, preparationTime: 6, image: 'https://images.unsplash.com/photo-1608223652762-5c26b5de2a6f?w=150&auto=format&fit=crop&q=80' },
    { name: 'Green Tea', category: 'Tea', price: 2.000, cost: 0.400, branch: branch1._id, isAvailable: true, preparationTime: 4, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=150&auto=format&fit=crop&q=80' },
    { name: 'Vanilla Latte', category: 'Coffee', price: 4.500, cost: 1.100, branch: branch1._id, isAvailable: true, preparationTime: 6, image: 'https://images.unsplash.com/photo-1598908314732-07113901949e?w=150&auto=format&fit=crop&q=80' },
    { name: 'Chocolate Cake', category: 'Desserts', price: 5.500, cost: 1.800, branch: branch1._id, isAvailable: true, preparationTime: 2, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&auto=format&fit=crop&q=80' },
    { name: 'Club Sandwich', category: 'Sandwiches', price: 7.000, cost: 2.500, branch: branch1._id, isAvailable: true, preparationTime: 8, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=150&auto=format&fit=crop&q=80' },
    { name: 'Hot Chocolate', category: 'Coffee', price: 3.500, cost: 0.800, branch: branch1._id, isAvailable: true, preparationTime: 5, image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=150&auto=format&fit=crop&q=80' },
    { name: 'Iced Coffee', category: 'Coffee', price: 4.000, cost: 0.900, branch: branch1._id, isAvailable: true, preparationTime: 4, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=150&auto=format&fit=crop&q=80' },
  ]);

  const [espressoP, cappuccino, latte, mocha, greenTea, vanillaLatte, chocoCake, clubSandwich, hotChoco, icedCoffee] = products;

  // Recipes
  await Recipe.insertMany([
    { product: espressoP._id, ingredients: [{ ingredient: beans._id, quantity: 18 }, { ingredient: sugar._id, quantity: 5 }] },
    { product: cappuccino._id, ingredients: [{ ingredient: beans._id, quantity: 18 }, { ingredient: milk._id, quantity: 0.12 }, { ingredient: sugar._id, quantity: 5 }] },
    { product: latte._id, ingredients: [{ ingredient: espresso._id, quantity: 60 }, { ingredient: milk._id, quantity: 0.2 }, { ingredient: sugar._id, quantity: 8 }] },
    { product: mocha._id, ingredients: [{ ingredient: espresso._id, quantity: 60 }, { ingredient: milk._id, quantity: 0.15 }, { ingredient: cocoa._id, quantity: 15 }, { ingredient: sugar._id, quantity: 10 }] },
    { product: greenTea._id, ingredients: [{ ingredient: tea._id, quantity: 5 }, { ingredient: sugar._id, quantity: 8 }] },
    { product: vanillaLatte._id, ingredients: [{ ingredient: espresso._id, quantity: 60 }, { ingredient: milk._id, quantity: 0.2 }, { ingredient: vanilla._id, quantity: 0.03 }] },
    { product: chocoCake._id, ingredients: [{ ingredient: choco._id, quantity: 80 }, { ingredient: sugar._id, quantity: 30 }] },
    { product: hotChoco._id, ingredients: [{ ingredient: cocoa._id, quantity: 25 }, { ingredient: milk._id, quantity: 0.2 }, { ingredient: sugar._id, quantity: 10 }] },
  ]);

  // Tunisian Customers
  const customers = await Customer.insertMany([
    { name: 'Khaled Bensalem', phone: '22111001', email: 'khaled@email.tn', loyaltyPoints: 120, totalSpent: 156.000, visitCount: 42, branch: branch1._id },
    { name: 'Olfa Trabelsi', phone: '98222002', email: 'olfa@email.tn', loyaltyPoints: 85, totalSpent: 85.000, visitCount: 28, branch: branch1._id },
    { name: 'Yassine Khelifi', phone: '55333003', loyaltyPoints: 220, totalSpent: 280.000, visitCount: 75, branch: branch1._id },
    { name: 'Meriem Boussoufa', phone: '44444004', loyaltyPoints: 45, totalSpent: 42.000, visitCount: 15, branch: branch1._id },
  ]);

  // Tunisian Employees with local salaries in TND
  await Employee.insertMany([
    { name: 'Lina Barista', email: 'lina@coffeemaster.tn', phone: '22000004', role: 'barista', salary: 1000, branch: branch1._id, hireDate: new Date('2023-01-15'), performanceRating: 4.5 },
    { name: 'Karim Cashier', email: 'karim@coffeemaster.tn', phone: '22000003', role: 'cashier', salary: 900, branch: branch1._id, hireDate: new Date('2023-03-10'), performanceRating: 4.2 },
    { name: 'Rania Supervisor', email: 'rania@coffeemaster.tn', phone: '98555005', role: 'supervisor', salary: 1300, branch: branch1._id, hireDate: new Date('2022-06-01'), performanceRating: 4.8 },
  ]);

  // Tunisian Expenses in TND
  const expenseMonth = new Date(); expenseMonth.setDate(1);
  await Expense.insertMany([
    { category: 'Rent', amount: 1800, description: 'Monthly rent - Lac 2', date: expenseMonth, branch: branch1._id, isRecurring: true, addedBy: admin._id },
    { category: 'Electricity', amount: 350, description: 'June electricity bill', date: expenseMonth, branch: branch1._id, isRecurring: true, addedBy: admin._id },
    { category: 'Water', amount: 60, description: 'June water bill', date: expenseMonth, branch: branch1._id, addedBy: admin._id },
    { category: 'Internet', amount: 75, description: 'Fiber internet package', date: expenseMonth, branch: branch1._id, isRecurring: true, addedBy: admin._id },
    { category: 'Supplies', amount: 400, description: 'Coffee supplies and packaging', date: new Date(), branch: branch1._id, addedBy: manager._id },
  ]);

  // Sample orders matching Tunisian Dinar values (last 30 days)
  const orderItems = [
    [{ product: cappuccino._id, name: 'Cappuccino', price: 3.500, quantity: 2 }, { product: espressoP._id, name: 'Espresso', price: 2.500, quantity: 1 }],
    [{ product: latte._id, name: 'Latte', price: 4.000, quantity: 1 }, { product: chocoCake._id, name: 'Chocolate Cake', price: 5.500, quantity: 1 }],
    [{ product: mocha._id, name: 'Mocha', price: 4.500, quantity: 2 }],
    [{ product: greenTea._id, name: 'Green Tea', price: 2.000, quantity: 2 }, { product: clubSandwich._id, name: 'Club Sandwich', price: 7.000, quantity: 1 }],
    [{ product: vanillaLatte._id, name: 'Vanilla Latte', price: 4.500, quantity: 1 }, { product: cappuccino._id, name: 'Cappuccino', price: 3.500, quantity: 1 }],
    [{ product: hotChoco._id, name: 'Hot Chocolate', price: 3.500, quantity: 3 }],
    [{ product: icedCoffee._id, name: 'Iced Coffee', price: 4.000, quantity: 2 }, { product: chocoCake._id, name: 'Chocolate Cake', price: 5.500, quantity: 2 }],
  ];

  const ordersToInsert = [];
  let orderIndex = 1;
  for (let d = 30; d >= 0; d--) {
    const date = new Date(); date.setDate(date.getDate() - d);
    const ordersPerDay = Math.floor(Math.random() * 8) + 5;
    for (let i = 0; i < ordersPerDay; i++) {
      const items = orderItems[Math.floor(Math.random() * orderItems.length)];
      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      ordersToInsert.push({
        orderNumber: `ORD-${String(orderIndex++).padStart(5, '0')}`,
        items,
        subtotal,
        discountAmount: 0,
        discountPercent: 0,
        taxAmount: 0,
        total: subtotal,
        paymentMethod: Math.random() > 0.3 ? 'cash' : 'card',
        status: 'completed',
        cashier: cashier._id,
        branch: branch1._id,
        customer: Math.random() > 0.5 ? customers[Math.floor(Math.random() * customers.length)]._id : undefined,
        createdAt: new Date(date.setHours(Math.floor(Math.random() * 14) + 7, Math.floor(Math.random() * 60))),
      });
    }
  }
  await Order.insertMany(ordersToInsert);

  // Tables — default Tunis floor plan
  await Table.insertMany([
    // Main Hall (6 tables)
    { number: '1', label: 'Window Seat', zone: 'Main Hall', capacity: 2, shape: 'square', branch: branch1._id },
    { number: '2', label: 'Centre Left',  zone: 'Main Hall', capacity: 4, shape: 'square', branch: branch1._id },
    { number: '3', label: 'Centre Right', zone: 'Main Hall', capacity: 4, shape: 'square', branch: branch1._id },
    { number: '4', label: 'Corner Booth', zone: 'Main Hall', capacity: 6, shape: 'long',   branch: branch1._id },
    { number: '5', label: 'Fireplace',    zone: 'Main Hall', capacity: 2, shape: 'round',  branch: branch1._id },
    { number: '6', label: 'Group Table',  zone: 'Main Hall', capacity: 8, shape: 'long',   branch: branch1._id },
    // Garden Terrace (4 tables)
    { number: 'T1', label: 'Garden A', zone: 'Garden Terrace', capacity: 2, shape: 'round', branch: branch1._id },
    { number: 'T2', label: 'Garden B', zone: 'Garden Terrace', capacity: 2, shape: 'round', branch: branch1._id },
    { number: 'T3', label: 'Garden C', zone: 'Garden Terrace', capacity: 4, shape: 'square', branch: branch1._id },
    { number: 'T4', label: 'Parasol',  zone: 'Garden Terrace', capacity: 4, shape: 'round', branch: branch1._id },
    // Bar (2 stools)
    { number: 'B1', label: 'Bar Left',  zone: 'Bar', capacity: 1, shape: 'round', branch: branch1._id },
    { number: 'B2', label: 'Bar Right', zone: 'Bar', capacity: 1, shape: 'round', branch: branch1._id },
  ]);

  // Seed mock suppliers
  const [supplier1, supplier2] = await Supplier.insertMany([
    { name: 'SOTUCHOC Tunis', email: 'contact@sotuchoc.tn', phone: '71-222-333', address: 'Zone Industrielle Megrine, Ben Arous', branch: branch1._id, outstandingBalance: 450.000 },
    { name: 'Générale Laitière Tunis', email: 'sales@gl.tn', phone: '71-444-555', address: 'Charguia 2, Tunis', branch: branch1._id, outstandingBalance: 0.000 },
  ]);

  // Seed mock purchase orders
  await PurchaseOrder.insertMany([
    {
      poNumber: 'PO-00001',
      supplier: supplier1._id,
      items: [
        { ingredient: choco._id, name: 'Chocolate', quantity: 5000, costPerUnit: 0.01, total: 50.000 }
      ],
      totalAmount: 50.000,
      status: 'validated',
      paymentStatus: 'paid',
      branch: branch1._id,
      createdBy: manager._id,
      notes: 'Procurement for cake chocolate blocks.'
    },
    {
      poNumber: 'PO-00002',
      supplier: supplier2._id,
      items: [
        { ingredient: milk._id, name: 'Whole Milk', quantity: 100, costPerUnit: 1.450, total: 145.000 }
      ],
      totalAmount: 145.000,
      status: 'pending',
      paymentStatus: 'unpaid',
      branch: branch1._id,
      createdBy: manager._id,
      notes: 'Urgent demand of whole milk cartons.'
    }
  ]);

  // Seed mock shifts
  await Shift.insertMany([
    {
      shiftNumber: 'SFT-00001',
      cashier: cashier._id,
      branch: branch1._id,
      status: 'closed',
      openingTime: new Date(Date.now() - 24*60*60*1000),
      closingTime: new Date(Date.now() - 16*60*60*1000),
      openingCash: 150.000,
      expectedCash: 350.000,
      actualCash: 350.000,
      variance: 0.000,
      cashSales: 200.000,
      cardSales: 120.000,
      expensesPaid: 0.000,
      notes: 'Morning shift went smoothly.'
    },
    {
      shiftNumber: 'SFT-00002',
      cashier: cashier._id,
      branch: branch1._id,
      status: 'closed',
      openingTime: new Date(Date.now() - 15*60*60*1000),
      closingTime: new Date(Date.now() - 8*60*60*1000),
      openingCash: 150.000,
      expectedCash: 420.000,
      actualCash: 415.000,
      variance: -5.000,
      cashSales: 270.000,
      cardSales: 180.000,
      expensesPaid: 0.000,
      notes: 'Discrepancy of 5 TND in cash drawer.'
    }
  ]);

  console.log('✅ Database seeded successfully with Tunisian Localized Data!');
  console.log('');
  console.log('👤 Login credentials:');
  console.log('   Admin:   admin@coffeemaster.tn   / password123');
  console.log('   Manager: manager@coffeemaster.tn / password123');
  console.log('   Cashier: cashier@coffeemaster.tn / password123');
  console.log('   Barista: barista@coffeemaster.tn / password123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
