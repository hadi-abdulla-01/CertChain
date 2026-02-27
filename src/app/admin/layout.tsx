'use client';

/**
 * Admin Layout — Auth Guard
 * Protects all /admin/* pages via Firebase onAuthStateChanged.
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, LogOut, Shield, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    // Check if super admin
                    const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
                    setIsAdmin(adminDoc.exists());
                } catch (err) {
                    console.error("Error checking admin status:", err);
                    setIsAdmin(false);
                }
                setChecking(false);
            } else {
                setChecking(false);
                router.replace('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.replace('/login');
    };

    if (checking) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Restoring session...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div>
            {/* Admin sub-header */}
            <div className="border-b bg-muted/30 px-4 py-2">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Admin Panel</span>
                        </div>
                        
                        <Separator orientation="vertical" className="h-4" />
                        
                        <nav className="flex items-center gap-2">
                            <Button asChild variant={pathname === '/admin' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs">
                                <Link href="/admin">
                                    <LayoutDashboard className="mr-2 h-3 w-3" />
                                    University Dashboard
                                </Link>
                            </Button>
                            
                            {isAdmin && (
                                <Button asChild variant={pathname === '/admin/super' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-xs text-primary">
                                    <Link href="/admin/super">
                                        <ShieldCheck className="mr-2 h-3 w-3" />
                                        Super Admin Panel
                                    </Link>
                                </Button>
                            )}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px] hidden sm:block">
                            {user.email}
                        </Badge>
                        <Button
                            id="admin-logout-btn"
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            className="h-7 gap-2 text-muted-foreground hover:text-destructive text-xs"
                        >
                            <LogOut className="h-3 w-3" />
                            Logout
                        </Button>
                    </div>
                </div>
            </div>

            {children}
        </div>
    );
}