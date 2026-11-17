
export default () => ({
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'admin',
    name: process.env.DATABASE_NAME || 'ticket_management',
    url: process.env.DATABASE_URL,
  },
});
