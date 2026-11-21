import type { ReactNode } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';

export default function ConfirmDelete({ title, description = 'This cannot be undone.', onConfirm, children, action = 'Delete' }: { title: string; description?: string; onConfirm: () => void; children: ReactNode; action?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">{action}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
