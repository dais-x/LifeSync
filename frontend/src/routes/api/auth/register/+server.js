import { json } from '@sveltejs/kit';
import { users, tokens } from '$lib/server/db.js';
import { hashPassword } from '$lib/server/auth/password.js';
import { generateOTP, hashToken } from '$lib/server/auth/token.js';
import { sendEmail } from '$lib/server/email.js';

export async function POST({ request }) {
    try {
        const { name, email: rawEmail, password } = await request.json();

        if (!rawEmail || !password) {
            return json({ error: 'Email and password are required' }, { status: 400 });
        }

        const email = rawEmail.toLowerCase();
        const userCol = await users();
        const existingUser = await userCol.findOne({ email });

        if (existingUser) {
            return json({ error: 'User already exists' }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);
        const user = {
            name: name || 'User',
            email,
            passwordHash,
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await userCol.insertOne(user);
        const userId = result.insertedId;

        // Verification OTP
        const otp = generateOTP();
        const tokenHash = hashToken(otp);
        const tokenCol = await tokens();
        await tokenCol.insertOne({
            userId,
            type: 'email_verification',
            tokenHash,
            attempts: 0,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            createdAt: new Date()
        });

        // Send verification email
        try {
            await sendEmail({
                to: email,
                subject: 'Verify your LifeSync account',
                templateData: {
                    name: name || 'User',
                    otp_code: otp
                },
                html: `
                    <h1>Verify your account</h1>
                    <p>Your verification code is: ${otp}</p>
                `
            });
        } catch (emailError) {
            // This will catch the silent crash and print EXACTLY why Resend is failing
            console.error("CRITICAL EMAIL ERROR:", emailError);
            return json({ error: 'Account created, but our email server failed to send the OTP. Please try logging in to resend it.' }, { status: 500 });
        }

        return json({ message: 'User registered successfully. Please verify your email with the OTP sent.' });
        
    } catch (error) {
        console.error("REGISTRATION ERROR:", error);
        return json({ error: 'An unexpected server error occurred.' }, { status: 500 });
    }
}