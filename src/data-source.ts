import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Adjust path if .env is not in project root

const AppDataSource: DataSource = new DataSource({
  type: 'mysql', // Make sure this matches your database type
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false, // ALWAYS false in production; use migrations
  logging: false, // Set to true for debugging if needed
  entities: [
    // Path to your compiled entity files in the 'dist' folder
    // Adjust this path pattern based on your project structure
    path.join(__dirname, '../dist/**/*.entity.js'),
  ],
  migrations: [
    // Path to your compiled migration files in the 'dist' folder
    // Adjust this path pattern based on where your migrations are stored
    path.join(__dirname, '../dist/database/migrations/*.js'),
    // Common migration paths:
    // path.join(__dirname, '../dist/migrations/*.js'),
    // path.join(__dirname, '../dist/src/migrations/*.js'),
  ],
  subscribers: [],
} as DataSourceOptions); // Cast to DataSourceOptions to satisfy type checker

export default AppDataSource;