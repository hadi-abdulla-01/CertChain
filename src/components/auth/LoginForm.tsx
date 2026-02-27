'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, AlertCircle, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    const email = (formData.get('email') as string).toLowerCase().trim();
    const password = formData.get('password') as string;

    try {
      // 1. Attempt to sign in
      try {
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/admin');
      } catch (signInErr: any) {
        // 2. If user doesn't exist, check if they are whitelisted as a university
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          const q = query(collection(db, 'universities'), where('emailDomain', '==', email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // User is whitelisted! Create their Auth account.
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Link the new UID to the university record
            const uniDoc = querySnapshot.docs[0];
            await setDoc(doc(db, 'universities', uniDoc.id), {
              adminUid: userCredential.user.uid
            }, { merge: true });

            router.push('/admin');
          } else {
            // Check if it was just a wrong password for an existing account
            setError('Invalid credentials. If you are a University Admin, please ensure your email was whitelisted by the Super Admin.');
            setIsLoading(false);
          }
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      let message = "An error occurred during login.";
      if (err.code === 'auth/network-request-failed') message = "Network error. Please check your connection.";
      if (err.code === 'auth/too-many-requests') message = "Too many attempts. Please try again later.";
      if (err.code === 'auth/service-unavailable') message = "Firebase service is briefly unavailable. Please try again in a few seconds.";
      
      setError(message);
      setIsLoading(false);
    }
  };

  const loginAsSuperAdmin = async () => {
    setIsLoading(true);
    setError('');
    const demoEmail = 'admin@certchain.com';
    const demoPass = 'password123';

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPass);
      } catch {
        userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
      }

      // Ensure super-admin role
      await setDoc(doc(db, 'admins', userCredential.user.uid), {
        email: demoEmail,
        role: 'super-admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });

      router.push('/admin/super');
    } catch (err: any) {
      console.error("Super Admin Login Error:", err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleLogin} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@university.edu"
            required
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        <div className="grid gap-2">
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Sign In / Register
          </Button>
          <p className="text-[10px] text-center text-muted-foreground px-4">
            New University Admins: Sign in with the whitelisted email and your preferred password to register.
          </p>
        </div>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-medium">Platform Management</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full border-primary/30 hover:bg-primary/5 text-primary"
        onClick={loginAsSuperAdmin}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        Login as Platform Super Admin
      </Button>
    </div>
  );
}
