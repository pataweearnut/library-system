import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1720000000000 implements MigrationInterface {
  name = 'InitSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for user.role matching the TypeORM Role enum
    await queryRunner.query(`
      CREATE TYPE "public"."user_role_enum" AS ENUM ('admin', 'librarian', 'member')
    `);

    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "email" character varying(255) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'member',
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "book" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "title" character varying(500) NOT NULL,
        "author" character varying(300) NOT NULL,
        "isbn" character varying(20) NOT NULL,
        "publicationYear" integer NOT NULL,
        "totalQuantity" integer NOT NULL DEFAULT 0,
        "availableQuantity" integer NOT NULL DEFAULT 0,
        "coverImagePath" character varying(2048),
        CONSTRAINT "UQ_book_isbn" UNIQUE ("isbn"),
        CONSTRAINT "PK_book_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "borrowing" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "borrowedAt" TIMESTAMP NOT NULL,
        "returnedAt" TIMESTAMP,
        "userId" uuid,
        "bookId" uuid,
        CONSTRAINT "PK_borrowing_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_user_createdAt" ON "user" ("createdAt")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_book_createdAt" ON "book" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_book_title" ON "book" ("title")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_book_author" ON "book" ("author")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_borrowing_book_borrowedAt" ON "borrowing" ("bookId", "borrowedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_borrowing_user_book_returnedAt" ON "borrowing" ("userId", "bookId", "returnedAt")`,
    );

    await queryRunner.query(`
      ALTER TABLE "borrowing"
      ADD CONSTRAINT "FK_borrowing_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "borrowing"
      ADD CONSTRAINT "FK_borrowing_book" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "borrowing" DROP CONSTRAINT "FK_borrowing_book"`,
    );
    await queryRunner.query(
      `ALTER TABLE "borrowing" DROP CONSTRAINT "FK_borrowing_user"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_borrowing_user_book_returnedAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_borrowing_book_borrowedAt"`,
    );

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_book_author"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_book_title"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_book_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_createdAt"`);

    await queryRunner.query(`DROP TABLE "borrowing"`);
    await queryRunner.query(`DROP TABLE "book"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}

