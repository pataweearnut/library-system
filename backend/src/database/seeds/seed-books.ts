import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { BooksService } from '../../modules/books/books.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const booksService = app.get(BooksService);

  const sampleBooks = [
    {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '9780132350884',
      publicationYear: 2008,
      totalQuantity: 5,
      availableQuantity: 5,
    },
    {
      title: 'The Pragmatic Programmer',
      author: 'Andrew Hunt, David Thomas',
      isbn: '9780201616224',
      publicationYear: 1999,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      author: 'Erich Gamma et al.',
      isbn: '9780201633610',
      publicationYear: 1994,
      totalQuantity: 4,
      availableQuantity: 4,
    },
    {
      title: 'Refactoring',
      author: 'Martin Fowler',
      isbn: '9780134757599',
      publicationYear: 2018,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen et al.',
      isbn: '9780262046305',
      publicationYear: 2022,
      totalQuantity: 2,
      availableQuantity: 2,
    },
    {
      title: 'The Mythical Man-Month',
      author: 'Frederick P. Brooks Jr.',
      isbn: '9780201835953',
      publicationYear: 1995,
      totalQuantity: 4,
      availableQuantity: 4,
    },
    {
      title: 'Code Complete',
      author: 'Steve McConnell',
      isbn: '9780735619678',
      publicationYear: 2004,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'Domain-Driven Design',
      author: 'Eric Evans',
      isbn: '9780321125217',
      publicationYear: 2003,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'JavaScript: The Good Parts',
      author: 'Douglas Crockford',
      isbn: '9780596517748',
      publicationYear: 2008,
      totalQuantity: 5,
      availableQuantity: 5,
    },
    {
      title: "You Don't Know JS",
      author: 'Kyle Simpson',
      isbn: '9781491904244',
      publicationYear: 2015,
      totalQuantity: 4,
      availableQuantity: 4,
    },
    {
      title: 'The Clean Coder',
      author: 'Robert C. Martin',
      isbn: '9780137081073',
      publicationYear: 2011,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'Effective Java',
      author: 'Joshua Bloch',
      isbn: '9780134685991',
      publicationYear: 2017,
      totalQuantity: 4,
      availableQuantity: 4,
    },
    {
      title: 'Head First Design Patterns',
      author: 'Eric Freeman, Elisabeth Robson',
      isbn: '9780596007126',
      publicationYear: 2004,
      totalQuantity: 5,
      availableQuantity: 5,
    },
    {
      title: 'The Art of Computer Programming, Vol. 1',
      author: 'Donald E. Knuth',
      isbn: '9780201896831',
      publicationYear: 1997,
      totalQuantity: 2,
      availableQuantity: 2,
    },
    {
      title: 'Structure and Interpretation of Computer Programs',
      author: 'Harold Abelson, Gerald Jay Sussman',
      isbn: '9780262510875',
      publicationYear: 1996,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'Operating System Concepts',
      author: 'Abraham Silberschatz et al.',
      isbn: '9781118063330',
      publicationYear: 2012,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'Database System Concepts',
      author: 'Abraham Silberschatz et al.',
      isbn: '9780078022159',
      publicationYear: 2019,
      totalQuantity: 4,
      availableQuantity: 4,
    },
    {
      title: 'Python Crash Course',
      author: 'Eric Matthes',
      isbn: '9781593275990',
      publicationYear: 2015,
      totalQuantity: 5,
      availableQuantity: 5,
    },
    {
      title: 'Fluent Python',
      author: 'Luciano Ramalho',
      isbn: '9781492056355',
      publicationYear: 2021,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'The Go Programming Language',
      author: 'Alan Donovan, Brian Kernighan',
      isbn: '9780134190440',
      publicationYear: 2015,
      totalQuantity: 4,
      availableQuantity: 4,
    },
    {
      title: 'Rust in Action',
      author: 'Tim McNamara',
      isbn: '9781617294552',
      publicationYear: 2021,
      totalQuantity: 2,
      availableQuantity: 2,
    },
    {
      title: 'Building Microservices',
      author: 'Sam Newman',
      isbn: '9781492034025',
      publicationYear: 2021,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'Release It!',
      author: 'Michael T. Nygard',
      isbn: '9781680502398',
      publicationYear: 2018,
      totalQuantity: 3,
      availableQuantity: 3,
    },
    {
      title: 'Site Reliability Engineering',
      author: 'Betsy Beyer et al.',
      isbn: '9781491929124',
      publicationYear: 2016,
      totalQuantity: 2,
      availableQuantity: 2,
    },
    {
      title: 'The Phoenix Project',
      author: 'Gene Kim et al.',
      isbn: '9781942788294',
      publicationYear: 2018,
      totalQuantity: 5,
      availableQuantity: 5,
    },
  ];

  for (const book of sampleBooks) {
    try {
      // Use create, let database enforce unique ISBN

      await booksService.create(book, undefined);

      console.log(`Seeded book: ${book.title}`);
    } catch (e) {
      // Likely already exists; skip

      console.warn(`Skipping book "${book.title}": ${(e as Error).message}`);
    }
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
