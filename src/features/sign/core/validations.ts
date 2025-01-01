import { object, string } from 'yup';

export const registerSchema = object({
    email: string().required().email(),
    password: string().min(8).required(),
    name: string().required().min(3).max(30)
});

export const activationTokenSchema = object({
    token: string().required().uuid()
})

export const resendActivationTokenSchema = object({
    email: string().required().email()
})

export const signInSchema = object({
    email: string().required().email(),
    password: string().required()
})
