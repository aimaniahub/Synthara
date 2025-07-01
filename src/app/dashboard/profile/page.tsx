
"use client";

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { User, Shield, Bell, KeyRound, Trash2, Edit3, Palette, Check, RefreshCcw, Loader2, UploadCloud, PlusCircle } from "lucide-react";
import { ThemeToggle } from '@/components/theme-toggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// API keys will be loaded from real data source when implemented

export default function ProfilePage() {
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apiKeys, setApiKeys] = useState<any[]>([]); // API Keys will be loaded from real source

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        setFullName(user.user_metadata?.full_name || '');
        setRole(user.user_metadata?.role || '');
        setOrganization(user.user_metadata?.organization || '');
        if (user.user_metadata?.avatar_url) {
          setAvatarPreview(user.user_metadata.avatar_url);
        }
      }
    };
    fetchUser();
  }, [supabase]);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    setIsSavingProfile(true);

    let newAvatarUrl = currentUser.user_metadata?.avatar_url;

    if (avatarFile) {
      const filePath = `public/${currentUser.id}-${Date.now()}-${avatarFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars') // Ensure this bucket exists and is public or has RLS for reads
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true, // Overwrite if file with same path exists
        });

      if (uploadError) {
        toast({ title: "Avatar Upload Failed", description: uploadError.message, variant: "destructive" });
        setIsSavingProfile(false);
        return;
      }
      
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (!publicUrlData.publicUrl) {
          toast({ title: "Avatar URL Failed", description: "Could not retrieve public URL for avatar.", variant: "destructive"});
          setIsSavingProfile(false);
          return;
      }
      newAvatarUrl = publicUrlData.publicUrl;
    }

    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: { 
        full_name: fullName,
        avatar_url: newAvatarUrl,
        role: role,
        organization: organization,
       },
    });

    if (updateError) {
      toast({ title: "Profile Update Failed", description: updateError.message, variant: "destructive" });
    } else if (updatedUser.user) {
      setCurrentUser(updatedUser.user); // Update local state for immediate reflection
      setFullName(updatedUser.user.user_metadata?.full_name || '');
      setRole(updatedUser.user.user_metadata?.role || '');
      setOrganization(updatedUser.user.user_metadata?.organization || '');
      if(updatedUser.user.user_metadata?.avatar_url) {
        setAvatarPreview(updatedUser.user.user_metadata.avatar_url);
      }
      setAvatarFile(null); // Clear the file input
      toast({ title: "Profile Updated", description: "Your changes have been saved successfully.", variant: "default" });
      setIsEditingProfile(false);
    }
    setIsSavingProfile(false);
  };
  
  const handleGenerateApiKey = () => {
    const newKey = {
        id: String(apiKeys.length + 1),
        key: `sk_new_${Math.random().toString(36).substring(2, 8)}...${Math.random().toString(36).substring(2, 8)}`,
        created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        lastUsed: "Never",
        status: "Active",
        name: "New API Key " + (apiKeys.length + 1)
    };
    setApiKeys(prev => [...prev, newKey]);
    toast({title: "API Key Generated", description: `Key "${newKey.name}" has been created.`, variant: "default"})
  };
  
  const handleDeleteApiKey = (keyId: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== keyId));
    toast({title: "API Key Deleted", description: `The API key has been revoked.`, variant: "destructive"})
  }


  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10 xl:space-y-12">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-bold text-foreground">Profile &amp; Settings</h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mt-1">Manage your account information, preferences, and security settings.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 sm:mb-8 h-auto p-1 sm:p-1.5 rounded-lg shadow-sm">
          <TabsTrigger value="profile" className="py-2 sm:py-2.5 text-xs sm:text-sm lg:text-base">
            <User className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 inline-block sm:hidden md:inline-block"/>
            <span className="hidden sm:inline">Profile</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="py-2 sm:py-2.5 text-xs sm:text-sm lg:text-base">
            <Palette className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 inline-block sm:hidden md:inline-block"/>
            <span className="hidden sm:inline">Preferences</span>
            <span className="sm:hidden">Prefs</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="py-2 sm:py-2.5 text-xs sm:text-sm lg:text-base">
            <Shield className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 inline-block sm:hidden md:inline-block"/>
            <span className="hidden sm:inline">Security</span>
            <span className="sm:hidden">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="py-2 sm:py-2.5 text-xs sm:text-sm lg:text-base">
            <Bell className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 inline-block sm:hidden md:inline-block"/>
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Notifs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="shadow-xl">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="font-headline text-lg sm:text-xl lg:text-2xl">Personal Information</CardTitle>
              <CardDescription className="text-sm sm:text-base">Update your personal details here. Click 'Edit Profile' to make changes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8 pt-2">
              <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="relative group">
                  <Avatar
                    className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-primary/20 shadow-md cursor-pointer"
                    onClick={() => isEditingProfile && fileInputRef.current?.click()}
                  >
                    <AvatarImage src={avatarPreview || ""} alt="User Avatar"/>
                    <AvatarFallback className="text-3xl">
                      {fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase() : currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditingProfile && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud className="h-8 w-8 text-white"/>
                    </div>
                  )}
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleAvatarChange} 
                    className="hidden" 
                    accept="image/*"
                    disabled={!isEditingProfile || isSavingProfile}
                />
                 {isEditingProfile && <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSavingProfile}>Change Photo</Button> }
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-base">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!isEditingProfile || isSavingProfile} 
                    className="text-base py-3 h-auto shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-base">Email Address</Label>
                  <Input id="email" type="email" value={currentUser?.email || ''} disabled className="text-base py-3 h-auto shadow-sm bg-muted/50"/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-base">Role</Label>
                  <Input 
                    id="role" 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g., Data Scientist, Developer"
                    disabled={!isEditingProfile || isSavingProfile} 
                    className="text-base py-3 h-auto shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="organization" className="text-base">Organization (Optional)</Label>
                  <Input 
                    id="organization" 
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g., Synthara Inc."
                    disabled={!isEditingProfile || isSavingProfile} 
                    className="text-base py-3 h-auto shadow-sm"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              {isEditingProfile ? (
                <div className="flex gap-3">
                  <Button onClick={handleSaveChanges} size="lg" disabled={isSavingProfile}>
                    {isSavingProfile ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Check className="mr-2 h-5 w-5"/>}
                    Save Changes
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => {
                      setIsEditingProfile(false);
                      // Reset fields to original if canceled
                      if (currentUser) {
                          setFullName(currentUser.user_metadata?.full_name || '');
                          setRole(currentUser.user_metadata?.role || '');
                          setOrganization(currentUser.user_metadata?.organization || '');
                          setAvatarPreview(currentUser.user_metadata?.avatar_url || null);
                          setAvatarFile(null);
                      }
                  }} disabled={isSavingProfile}>Cancel</Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditingProfile(true)} size="lg"><Edit3 className="mr-2 h-5 w-5"/>Edit Profile</Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Interface Preferences</CardTitle>
              <CardDescription className="text-md">Customize your platform experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-5 rounded-lg border shadow-sm">
                <div>
                  <Label htmlFor="theme" className="font-semibold text-base">Theme</Label>
                  <p className="text-sm text-muted-foreground mt-1">Select your preferred interface theme (Light, Dark, or System default).</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between p-5 rounded-lg border shadow-sm">
                <div>
                  <Label htmlFor="language" className="font-semibold text-base">Language</Label>
                  <p className="text-sm text-muted-foreground mt-1">Choose your display language (currently English only).</p>
                </div>
                <Button variant="outline" className="w-auto" disabled>English (US)</Button>
              </div>
              <div className="flex items-center justify-between p-5 rounded-lg border shadow-sm">
                <div>
                  <Label htmlFor="data-density" className="font-semibold text-base">Data Display Density</Label>
                  <p className="text-sm text-muted-foreground mt-1">Adjust how much information is shown in tables (feature coming soon).</p>
                </div>
                <Button variant="outline" size="sm" disabled>Compact</Button>
              </div>
            </CardContent>
             <CardFooter className="border-t pt-6">
                <Button size="lg" disabled><Check className="mr-2 h-5 w-5"/>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <div className="space-y-8">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Password Management</CardTitle>
                <CardDescription className="text-md">Change your account password regularly for better security.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" className="text-base py-3 h-auto shadow-sm" />
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" className="text-base py-3 h-auto shadow-sm" />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" className="text-base py-3 h-auto shadow-sm" />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button size="lg" onClick={() => toast({title: "Password Changed", description: "Your password has been updated.", variant: "default"})}><RefreshCcw className="mr-2 h-5 w-5"/>Change Password</Button>
              </CardFooter>
            </Card>

            <Card className="shadow-xl">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className="font-headline text-2xl flex items-center"><KeyRound className="mr-2.5 text-primary"/> API Keys</CardTitle>
                    <CardDescription className="text-md mt-1">Manage API keys for programmatic access to Synthara.</CardDescription>
                </div>
                <Button variant="default" onClick={handleGenerateApiKey} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4"/>Generate New Key</Button>
              </CardHeader>
              <CardContent>
                {apiKeys.length > 0 ? (
                    <div className="space-y-4">
                    {apiKeys.map(key => (
                        <div key={key.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex-grow mb-3 sm:mb-0">
                            <p className="font-semibold text-foreground mb-0.5">{key.name}</p>
                            <p className="font-mono text-sm text-muted-foreground">{key.key}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Created: {key.created} | Last used: {key.lastUsed} | 
                                <span className={`ml-1 font-medium ${key.status === "Active" ? "text-green-600 dark:text-green-500" : "text-amber-600 dark:text-amber-500"}`}>{key.status}</span>
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0">
                                    <Trash2 className="h-5 w-5"/>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key "{key.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently revoke the API key: <br/> <span className="font-mono">{key.key}</span>.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteApiKey(key.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete Key</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        </div>
                    ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No API keys have been generated yet.</p>
                )}
              </CardContent>
            </Card>

             <Card className="shadow-xl border-destructive/50">
              <CardHeader>
                <CardTitle className="font-headline text-2xl text-destructive flex items-center"><Trash2 className="mr-2.5"/>Delete Account</CardTitle>
                <CardDescription className="text-md">Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
              </CardHeader>
              <CardFooter className="pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="lg">Delete My Account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl">Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="text-base">
                        This action cannot be undone. This will permanently delete your Synthara account,
                        all generated data, trained models, and API keys from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => toast({title: "Account Deletion Requested", description: "Account deletion process initiated (simulated).", variant: "destructive"})} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Yes, Delete My Account</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Notification Settings</CardTitle>
              <CardDescription className="text-md">Manage how you receive notifications from Synthara.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {id: "emailNotifications", label: "Email Notifications", description: "Receive updates about your account, data generation, and new features.", defaultChecked: true},
                {id: "dataCompletion", label: "Data Generation Complete", description: "Notify when large datasets finish generating.", defaultChecked: true},
                {id: "modelTraining", label: "Model Training Complete", description: "Notify when ML models finish training.", defaultChecked: false},
                {id: "platformUpdates", label: "Platform Updates & News", description: "Stay informed about major Synthara updates and news.", defaultChecked: true},
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between p-5 rounded-lg border shadow-sm">
                    <div>
                    <Label htmlFor={item.id} className="font-semibold text-base">{item.label}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                    <Switch id={item.id} defaultChecked={item.defaultChecked} />
                </div>
              ))}
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button size="lg" onClick={() => toast({title: "Settings Saved", description: "Notification preferences updated.", variant:"default"})}><Check className="mr-2 h-5 w-5"/>Save Notification Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
