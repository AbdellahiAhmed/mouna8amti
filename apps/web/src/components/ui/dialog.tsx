import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog as Primitive } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./button";

/** Modal with the DESIGN.md entrance: scale 0.96→1 + fade, emphasized easing. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Primitive.Portal forceMount>
            <Primitive.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
              />
            </Primitive.Overlay>
            <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
              {/* Without a description, Radix needs an explicit undefined to know it is intentional. */}
              <Primitive.Content asChild {...(description ? {} : { "aria-describedby": undefined })}>
                <motion.div
                  className="relative w-full max-w-[35rem] rounded-lg bg-canvas p-6 shadow-float sm:p-8"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.3, 0, 0, 1.15] }}
                >
                  <Primitive.Title className="font-display text-h3 text-ink">{title}</Primitive.Title>
                  {description && (
                    <Primitive.Description className="mt-1 text-body text-slate">{description}</Primitive.Description>
                  )}
                  <Primitive.Close asChild>
                    <Button variant="ghost" size="icon" className="absolute end-4 top-4" aria-label="Close">
                      <X aria-hidden />
                    </Button>
                  </Primitive.Close>
                  <div className="mt-6">{children}</div>
                </motion.div>
              </Primitive.Content>
            </div>
          </Primitive.Portal>
        )}
      </AnimatePresence>
    </Primitive.Root>
  );
}
