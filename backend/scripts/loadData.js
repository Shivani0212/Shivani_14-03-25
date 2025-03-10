// import fs from 'fs';
// import mongoose from 'mongoose';
// import csvParser from 'csv-parser';
// import StoreStatus from '../models/StoreStatus.js';
// import MenuHours from '../models/MenuHours.js';
// import TimeZone from '../models/TimeZone.js';
// import dotenv from 'dotenv';

// dotenv.config();
// await mongoose.connect(process.env.MONGO_URI);

// const loadCSV = (filePath, model) => {
//     fs.createReadStream(filePath)
//         .pipe(csvParser())
//         .on('data', async (row) => {
//             await model.create(row);
//         })
//         .on('end', () => {
//             console.log(`${filePath} loaded successfully.`);
//         });
// };

// loadCSV('../data/store_status.csv', StoreStatus);
// loadCSV('../data/menu_hours.csv', MenuHours);
// loadCSV('../data/timezones.csv', TimeZone);
import fs from 'fs';
import csvParser from 'csv-parser';
import StoreStatus from '../models/StoreStatus.js'; // Assuming Mongoose model

export const uploadCSV = async (req, res) => {
    console.log('Uploading CSV file...');
    
    const filePath = req.file.path;
    console.log('File Path:', filePath);

    const results = [];

    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => {
            console.log('Parsed Row:', data); // Debug each row
            results.push(data);
        })
        .on('end', async () => {
            try {
                await StoreStatus.insertMany(results);
                console.log('Data successfully inserted into MongoDB');
                res.status(200).json({ message: 'CSV uploaded successfully' });
            } catch (error) {
                console.error('Error inserting data:', error);
                res.status(500).json({ error: 'Error inserting data' });
            }
        });
};
