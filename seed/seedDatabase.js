const User = require('../models/User');
const Note = require('../models/Note');
const connectDB = require('../config/db');
const bcrypt = require('bcrypt');

const seedDatabase = async () => {
    try {
        await connectDB();

        await User.deleteMany({});
        await Note.deleteMany({});

        const saltRounds = 10;
        const seedUsers = [
            { username: 'Alice', email: 'alice@example.com', password: await bcrypt.hash('password1', saltRounds) },
            { username: 'Bob', email: 'bob@example.com', password: await bcrypt.hash('password2', saltRounds) },
        ];
        const insertedUsers = await User.insertMany(seedUsers);
        console.log('Users seeded:', insertedUsers);

        const seedNotes = [
            { 
                user: insertedUsers[0]._id, 
                title: 'Shopping List', 
                content: 'Milk, Bread, Eggs, Coffee',
            },
            { 
                user: insertedUsers[0]._id, 
                title: 'Work Tasks', 
                content: 'Finish project report, Email John',
            },
            { 
                user: insertedUsers[1]._id, 
                title: 'Ideas', 
                content: 'Start a new blog about cooking',
            },
        ];
        const insertedNotes = await Note.insertMany(seedNotes);
        console.log('Notes seeded:', insertedNotes);

        console.log('Database seeding completed!');
        process.exit();
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDatabase();
