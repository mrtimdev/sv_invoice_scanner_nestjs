import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class ViewsController {
  @Get('/dashboard')
  @Render('dashboard')
  root() {
    return { title: 'Admin Dashboard' };
  }
}