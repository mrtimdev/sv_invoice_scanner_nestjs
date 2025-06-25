// user.repository.ts
import { EntityRepository, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  // custom methods
}