
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

export function SettingsPage() {
    const { toast } = useToast();
    const [displayName, setDisplayName] = useState("Demo User");
    const [photoURL, setPhotoURL] = useState("/placeholder-user.png");
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setPhotoURL(URL.createObjectURL(file));
      }
    };
    const handleUpdateProfile = () => toast({ title: "Profile Updated (Mock)", description: "Your display name and picture have been updated." });
    const handleChangePassword = () => toast({ title: "Password Changed (Mock)", description: "Your password has been successfully changed." });
    const handleDeleteAccount = () => toast({ title: "Account Deletion (Mock)", variant: "destructive" });
    const toggleTheme = (checked: boolean) => {
      setIsDarkMode(checked);
      document.documentElement.classList.toggle('dark', checked);
      document.documentElement.classList.toggle('light', !checked);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="font-headline text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your account and application preferences.</p>
            </div>
            <Card className="glass-card">
                <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update your display name and profile picture.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <Image src={photoURL} alt="Profile picture" width={96} height={96} className="rounded-full object-cover border-2 border-primary" />
                            <Label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-primary p-2 rounded-full cursor-pointer hover:bg-primary/80 transition-colors">
                                <Upload className="size-4 text-primary-foreground" />
                            </Label>
                            <Input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="display-name">Display Name</Label>
                            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter><Button onClick={handleUpdateProfile}>Save Profile</Button></CardFooter>
            </Card>
            <Card className="glass-card">
                <CardHeader><CardTitle>Security</CardTitle><CardDescription>Change your password.</CardDescription></CardHeader>
                <CardContent className="space-y-4 max-w-md">
                    <div className="space-y-2"><Label htmlFor="old-password">Old Password</Label><Input id="old-password" type="password" /></div>
                    <div className="space-y-2"><Label htmlFor="new-password">New Password</Label><Input id="new-password" type="password" /></div>
                    <div className="space-y-2"><Label htmlFor="confirm-password">Confirm New Password</Label><Input id="confirm-password" type="password" /></div>
                </CardContent>
                <CardFooter><Button onClick={handleChangePassword}>Change Password</Button></CardFooter>
            </Card>
            <Card className="glass-card">
                <CardHeader><CardTitle>Preferences</CardTitle><CardDescription>Customize the application appearance and notifications.</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="dark-mode" className="flex flex-col gap-1"><span>Dark Mode</span><span className="text-xs font-normal text-muted-foreground">Toggle between light and dark themes.</span></Label>
                        <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={toggleTheme} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="notifications" className="flex flex-col gap-1"><span>Enable Notifications</span><span className="text-xs font-normal text-muted-foreground">Receive updates and alerts.</span></Label>
                        <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
                    </div>
                </CardContent>
            </Card>
            <Card className="glass-card border-destructive/50">
                <CardHeader><CardTitle className="text-destructive">Account Actions</CardTitle><CardDescription>Permanent actions regarding your account.</CardDescription></CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div><h4 className="font-semibold">Delete Account</h4><p className="text-sm text-muted-foreground">Permanently delete your account and all associated data. This action cannot be undone.</p></div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="destructive">Delete Account</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your account and remove your data from our servers.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAccount}>Continue</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
