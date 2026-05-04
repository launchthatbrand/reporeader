"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@launchthatapp/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@launchthatapp/ui/drawer";

import { Button } from "@launchthatapp/ui/button";
import { Input } from "@launchthatapp/ui/input";
import { Label } from "@launchthatapp/ui/label";
import { cn } from "@launchthatapp/ui";
import { useIsMobile } from "~/hooks/use-mobile";

function ProfileForm() {
  return (
    <div>1asdasd</div>
  );
}

export default function TestDrawerPage() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = !useIsMobile();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">Drawer Test</h1>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Edit Profile</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Make changes to your profile here. Click save when you&apos;re
                done.
              </DialogDescription>
            </DialogHeader>
            <ProfileForm />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline">Edit Profile</Button>
          </DrawerTrigger>
          <DrawerContent className="">
            {/* <DrawerHeader className="text-left sticky top-0">
              <DrawerTitle>Edit profile</DrawerTitle>
              <DrawerDescription>
                Make changes to your profile here. Click save when you&apos;re
                done.
              </DrawerDescription>
            </DrawerHeader> */}
            <div className="no-scrollbar overflow-y-auto px-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <p
                  key={index}
                  className="mb-4 leading-normal style-lyra:mb-2 style-lyra:leading-relaxed"
                >
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                  eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                  enim ad minim veniam, quis nostrud exercitation ullamco laboris
                  nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
                  reprehenderit in voluptate velit esse cillum dolore eu fugiat
                  nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                  sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>
              ))}
            </div>
            {/* <ProfileForm /> */}
            <DrawerFooter className="pt-2 bg-muted">
              <form>
                <Input placeholder="Type something..." />
              </form>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </main>
  );
}
