import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/user.entity';
import { Book } from '../modules/books/book.entity';
import { Borrowing } from '../modules/borrowings/borrowing.entity';

export const TypeOrmDatabaseModule = TypeOrmModule.forRootAsync({
  useFactory: () => ({
    type: 'postgres',
    host: process.env.LIBRARY_SERVICE_DB_HOST || 'localhost',
    port: Number(process.env.LIBRARY_SERVICE_DB_PORT) || 5432,
    username: process.env.LIBRARY_SERVICE_DB_USER || 'postgres',
    password: process.env.LIBRARY_SERVICE_DB_PASS || 'postgres',
    database: process.env.LIBRARY_SERVICE_DB_NAME || 'library_db',
    entities: [User, Book, Borrowing],
    synchronize: true,
  }),
});
