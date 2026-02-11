import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../modules/users/users.service';
import { Role } from '../../common/enums/role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const defaultPassword = 'password123';

  const usersToSeed = [
    { email: 'admin@example.com', role: Role.ADMIN },
    { email: 'librarian@example.com', role: Role.LIBRARIAN },
    { email: 'member@example.com', role: Role.MEMBER },
  ];

  for (const { email, role } of usersToSeed) {
    const existing = await usersService.findByEmail(email);
    if (!existing) {
      await usersService.create({
        email,
        password: defaultPassword,
        role,
      });

      console.log(`Created ${role} user: ${email} / ${defaultPassword}`);
    }
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
