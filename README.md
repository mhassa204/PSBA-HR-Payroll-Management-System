# PSBA HR Payroll Management System

A comprehensive Human Resources and Payroll Management System built for the Punjab Sahulat Bazaars Authority (PSBA). This system provides complete employee lifecycle management, attendance tracking, leave management, travel expense claims, and organizational administration.

## 🏢 About PSBA

The Punjab Sahulat Bazaars Authority (PSBA) is a government organization that manages model bazaars and welfare activities across Punjab, Pakistan. This HR system is designed to handle the complex organizational structure including Head Office and multiple Bazaar locations.

## 🚀 Features

### 👥 Employee Management

- **Complete Employee Profiles**: Personal information, contact details, family information, and documents
- **Employment History**: Track multiple employment records with different organizations (PSBA, PMBMC, MBWO)
- **Document Management**: Upload and manage employee documents with categorization
- **Education & Experience**: Track educational qualifications and past work experience
- **Profile Pictures**: Employee photo management with image optimization

### 🏢 Organizational Structure

- **Department Management**: Create and manage organizational departments
- **Designation Management**: Job titles and position management
- **Role Tags**: Employment role categorization (admin, manager, supervisor, staff, worker)
- **Scale Grades**: BPS (Basic Pay Scale) and grade management for government employees
- **Location Management**: Head Office and Bazaar location management
- **District & City Management**: Geographic location management

### ⏰ Attendance & Time Management

- **Biometric Integration**: Support for ZKTeco attendance devices
- **Device Management**: Configure attendance devices by IP and port
- **Location-based Attendance**: Track attendance by different locations
- **Duty Roster Management**: Create and manage employee duty schedules
- **Attendance Reports**: Comprehensive attendance tracking and reporting

### 🏖️ Leave Management

- **Leave Application**: Employee self-service leave applications
- **Leave Types**: Configurable leave categories (sick, casual, annual, etc.)
- **Leave Bank System**: Per-employee leave allocation management
- **Approval Workflow**: Multi-stage approval routing (Recommend → Allow → Approve)
- **Backup Employee Assignment**: Assign backup resources during leave
- **Leave History**: Complete audit trail of leave applications and approvals

### 🚗 Travel & Expense Management

- **Travel Requests**: Submit and manage official travel requests
- **Expense Claims**: Detailed travel expense claim management
- **Multi-stage Approvals**: OPS → DG → HR → Accounts approval workflow
- **Rate Management**: Per-km and per-diem rates by employee grade
- **Document Support**: Upload receipts and supporting documents
- **Tranche Processing**: Group claims for batch processing by accounts

### 👤 User & Role Management

- **Role-Based Access Control (RBAC)**: Granular permission system
- **User Management**: Create and manage system users
- **Permission System**: Fine-grained access control
- **Session Management**: Secure user sessions with PostgreSQL storage

### ⚙️ System Administration

- **System Settings**: Configurable system parameters
- **Database Management**: Database maintenance and configuration
- **Security Settings**: Access control and security configurations
- **Audit Logs**: Complete system activity tracking
- **Theme Management**: Customizable UI themes

## 🛠️ Technology Stack

### Frontend

- **React 19.1.0** - Modern React with latest features
- **Vite 7.0.4** - Fast build tool and development server
- **Tailwind CSS 4.1.11** - Utility-first CSS framework
- **React Router DOM 7.7.0** - Client-side routing
- **React Hook Form 7.60.0** - Form management
- **Zustand 5.0.6** - State management
- **Axios 1.10.0** - HTTP client
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **Framer Motion** - Animation library

### Backend

- **Node.js** - JavaScript runtime
- **Express.js 5.1.0** - Web application framework
- **PostgreSQL** - Primary database
- **Prisma 6.12.0** - Database ORM and migration tool
- **Express Session** - Session management
- **Multer 2.0.2** - File upload handling
- **Bcryptjs** - Password hashing
- **Node-cron** - Scheduled tasks
- **ZKLib** - Biometric device integration

### Development Tools

- **ESLint** - Code linting
- **Nodemon** - Development server auto-restart
- **Prisma Studio** - Database management GUI

## 📁 Project Structure

```
PSBA-HR-Payroll-Management-System/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── features/         # Feature-based modules
│   │   │   ├── attendance/   # Attendance management
│   │   │   ├── auth/         # Authentication
│   │   │   ├── employees/    # Employee management
│   │   │   ├── roster/       # Duty roster management
│   │   │   ├── settings/     # System settings
│   │   │   ├── travel/       # Travel & expense management
│   │   │   └── users/        # User management
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service layers
│   │   ├── utils/            # Utility functions
│   │   └── styles/           # Global styles
│   ├── public/               # Static assets
│   └── package.json
├── server/                   # Node.js backend application
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Express middleware
│   │   └── utils/            # Utility functions
│   ├── prisma/               # Database schema and migrations
│   ├── uploads/              # File upload storage
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd PSBA-HR-Payroll-Management-System
   ```

2. **Install backend dependencies**

   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Database Setup**

   ```bash
   # Create PostgreSQL database
   createdb psba_hr_system

   # Set up environment variables
   cd ../server
   cp .env.example .env
   # Edit .env with your database credentials

   # Run database migrations
   npx prisma migrate deploy

   # Seed the database with initial data
   npm run seed
   ```

5. **Start the development servers**

   ```bash
   # Terminal 1 - Backend server
   cd server
   npm run dev

   # Terminal 2 - Frontend development server
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5175
   - Backend API: http://localhost:3000
   - Prisma Studio: `npx prisma studio` (in server directory)

### Environment Variables

Create a `.env` file in the `server` directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/psba_hr_system"

# Session
SESSION_SECRET="your-super-secret-session-key"

# Server
PORT=3000

# CORS (for production)
ALLOWED_ORIGINS="http://localhost:5175,https://yourdomain.com"
```

## 👥 User Roles & Permissions

The system implements a hierarchical role-based access control:

### System Roles

- **Super Admin**: Full system access and configuration
- **Director General (BPS 19-20)**: Executive level approvals
- **Senior Management (BPS 18)**: Management level access
- **Management (BPS 17)**: Assistant Director level
- **Operations**: Operational staff with specific permissions
- **HR**: Human resources management
- **Accounts**: Financial processing and approvals
- **Staff**: General employee access

### Permission Categories

- **Employee Management**: Create, read, update employee records
- **Attendance**: View and manage attendance data
- **Leave Management**: Apply, approve, and manage leaves
- **Travel Management**: Submit and approve travel requests/claims
- **Settings**: System configuration and master data
- **Reports**: Generate and view various reports

## 📊 Key Modules

### 1. Employee Management

- Complete employee lifecycle management
- Document management with file uploads
- Employment history tracking
- Education and experience records

### 2. Attendance System

- Biometric device integration
- Location-based attendance tracking
- Duty roster management
- Attendance reports and analytics

### 3. Leave Management

- Self-service leave applications
- Configurable leave types and banks
- Multi-stage approval workflow
- Backup employee assignment

### 4. Travel & Expense

- Travel request submission
- Expense claim management
- Multi-stage approval process
- Rate management by grade
- Document support

### 5. System Administration

- User and role management
- System settings configuration
- Master data management
- Audit logging

## 🔧 Development

### Available Scripts

**Frontend:**

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

**Backend:**

```bash
npm run dev          # Start with nodemon
npm start            # Start production server
npm run seed         # Seed database
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## 🚀 Deployment

### Production Build

1. **Build frontend**

   ```bash
   cd frontend
   npm run build
   ```

2. **Set up production environment**

   ```bash
   cd server
   # Update .env with production values
   npm run build  # If using TypeScript
   ```

3. **Deploy to server**
   - Upload built files to your server
   - Set up reverse proxy (nginx)
   - Configure SSL certificates
   - Set up process manager (PM2)

### Docker Deployment (Optional)

```dockerfile
# Example Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📝 API Documentation

The system provides RESTful APIs for all major operations:

### Authentication

- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/session` - Get current session

### Employee Management

- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance

- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/sync` - Sync from devices
- `GET /api/devices` - List attendance devices

### Leave Management

- `GET /api/leaves` - List leave applications
- `POST /api/leaves` - Submit leave application
- `PUT /api/leaves/:id/approve` - Approve leave
- `PUT /api/leaves/:id/reject` - Reject leave

### Travel Management

- `GET /api/travel/requests` - List travel requests
- `POST /api/travel/requests` - Submit travel request
- `GET /api/travel/claims` - List expense claims
- `POST /api/travel/claims` - Submit expense claim

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all linting passes

## 📄 License

This project is proprietary software developed for the Punjab Sahulat Bazaars Authority (PSBA). All rights reserved.

## 📞 Support

For technical support or questions:

- Create an issue in the repository
- Contact the development team
- Refer to the system documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core HR functionality
- **v1.1.0** - Added travel and expense management
- **v1.2.0** - Enhanced leave management with approval workflows
- **v1.3.0** - Improved attendance system with biometric integration

---

**Built with ❤️ for PSBA - Punjab Sahulat Bazaars Authority**
