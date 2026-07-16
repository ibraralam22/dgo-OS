import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to bypass JWT authentication verification on public routes
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
