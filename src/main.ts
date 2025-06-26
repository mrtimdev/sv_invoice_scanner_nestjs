import 'reflect-metadata';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as hbs from 'hbs';
import * as layouts from 'handlebars-layouts';

import * as session from 'express-session';
import * as passport from 'passport';


import * as cookieParser from 'cookie-parser';
import { engine } from 'express-handlebars';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],
  });

  // const configService = app.get(ConfigService); // Get ConfigService instance

  // app.use(
  //   session({
  //     secret: configService.get<string>('SESSION_SECRET'), 
  //     resave: false,
  //     saveUninitialized: false,
  //     cookie: { maxAge: 3600000 }, 
  //   }),
  // );
  app.use(cookieParser());
  app.use(passport.initialize());
  // app.use(passport.session());

  // app.use(new UserMiddleware().use);

  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
    prefix: '/uploads',
  });


  app.useStaticAssets(join(__dirname, '..', 'node_modules'), {
    prefix: '/assets/',
    setHeaders: (res) => {
        res.set('Cache-Control', 'public, max-age=31536000');
    }
  });



  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  
  // hbs.registerPartials(join(__dirname, '..', 'views/partials'));
  // hbs.registerPartials(join(__dirname, '..', 'views/admin'));
  // hbs.registerHelper('json', function(context) {
  //   return JSON.stringify(context);
  // });

  // layouts.register(hbs.handlebars);


  const hbs = engine({
    extname: '.hbs',
    // defaultLayout: 'main',
    layoutsDir: join(__dirname, '..', 'views', 'layouts'),
    partialsDir: join(__dirname, '..', 'views', 'partials'),
    ...(process.env.NODE_ENV === 'development' ? { 
      cache: false,
    } : {}),
    helpers: {
      section: function(name: string | number, options: { fn: (arg0: any) => any; }) {
        if (!this._sections) this._sections = {};
        this._sections[name] = options.fn(this);
        return null;
      },
      extend: function(layout: string, options: any) {
        return options.fn(this);
      },
      content: function(name: string, options: any) {
        if (!this._blocks) this._blocks = {};
        this._blocks[name] = options.fn(this);
        return null;
      },
      block: function(name: string) {
        return this._blocks && this._blocks[name] || '';
      },
      eq: function (v1: any, v2: any) {
        return v1 === v2;
      },
      ne: function (v1: any, v2: any) {
        return v1 !== v2;
      },
      json: (context: any) => JSON.stringify(context),
      isActive: function(path: any, currentPath: any) {
        return path === currentPath ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white';
      },
      startsWith: function(str: string, prefix: string, options: { fn: (arg0: any) => any; inverse: (arg0: any) => any; }) {
        if (typeof str === 'string' && str.startsWith(prefix)) {
          return options.fn(this);
        }
        return options.inverse(this);
      },


      isAuthenticated: () => !!this.user,
        hasRole: (role: any) => this.user?.roles?.includes(role),
      }
  });

//   {{#if (isAuthenticated)}}
//   {{#if (hasRole 'admin')}}
//     <a href="/admin">Admin Panel</a>
//   {{/if}}
// {{/if}}

  app.engine('hbs', hbs);
  app.setViewEngine('hbs');

  
  // CORS Configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [];
  console.log('Allowed Origins:', allowedOrigins);

  // app.enableCors({
  //   origin: (origin, callback) => {
  //     if (!origin || allowedOrigins.includes(origin)) {
  //       callback(null, true);
  //     } else {
  //       console.warn('Blocked by CORS:', origin);
  //       callback(new Error('Not allowed by CORS'), false);
  //     }
  //   },
  //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  //   credentials: true,
  //   preflightContinue: false,
  //   optionsSuccessStatus: 204
  // });

  app.useStaticAssets(join(__dirname, 'public', 'assets'), {
    prefix: '/assets',
    setHeaders: (res) => {
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  });

  app.useStaticAssets(join(__dirname, '..', 'node_modules'), {
    prefix: '/assets',  // Maps node_modules to /assets in URLs
  });

  app.useStaticAssets(join(__dirname, '..', 'node_modules', 'jquery', 'dist'), {
    prefix: '/assets/jquery',
    setHeaders: (res) => {
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  });

  app.useStaticAssets(join(__dirname, '..', 'node_modules', 'datatables.net', 'js'), {
    prefix: '/assets/datatables.net',
    setHeaders: (res) => {
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  });

  app.useStaticAssets(join(__dirname, '..', 'node_modules', 'datatables.net-bs5', 'js'), {
    prefix: '/assets/datatables.net-bs5',
    setHeaders: (res) => {
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  });



  // Get base URL from environment or use default
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  // Make BASE_URL available app-wide
  app.set('BASE_URL', BASE_URL);

  
  
  
  // Correct way to get the httpAdapter
  const httpAdapter = app.get(HttpAdapterHost).httpAdapter;
  
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  
  
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();