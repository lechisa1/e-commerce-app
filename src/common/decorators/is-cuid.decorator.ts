import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsCuid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCuid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          const cuidRegex = /^[a-z][a-z0-9]{24}$/;
          return cuidRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `Validation failed (cuid is expected)`;
        },
      },
    });
  };
}
