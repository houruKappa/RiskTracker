'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { countermeasureService } from '@/lib/api-services';
import { userService } from '@/lib/api-services';
import type { User } from '@/types/api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountermeasureFormDialogProps {
  riskId: string;
  targetType: 'CAUSE' | 'CONSEQUENCE';
  targetId: string;
  onSuccess?: () => void;
}

export function CountermeasureFormDialog({ riskId, targetType, targetId, onSuccess }: CountermeasureFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deadline, setDeadline] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.list().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      risk_id: string;
      target_type: 'CAUSE' | 'CONSEQUENCE';
      cause_id?: string;
      consequence_id?: string;
      description: string;
      assignee_id: string;
      deadline: string;
    }) => countermeasureService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countermeasures'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      toast.success('Countermeasure created successfully');
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create countermeasure';
      toast.error(message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      risk_id: riskId,
      target_type: targetType,
      cause_id: targetType === 'CAUSE' ? targetId : undefined,
      consequence_id: targetType === 'CONSEQUENCE' ? targetId : undefined,
      description: formData.get('description') as string,
      assignee_id: formData.get('assignee_id') as string,
      deadline,
    };

    if (!data.description || !data.assignee_id || !data.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    createMutation.mutate(data);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setDeadline('');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            + Add Countermeasure
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Countermeasure</DialogTitle>
            <DialogDescription>
              Define a mitigation action for this {targetType.toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Describe the countermeasure action"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assignee_id">Assignee *</Label>
                <Select name="assignee_id" required disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersData?.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Input
                      id="deadline"
                      name="deadline"
                      value={deadline}
                      readOnly
                      required
                      disabled={isLoading}
                      placeholder="Select deadline"
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={undefined}
                      onSelect={(date) => {
                        if (date) {
                          setDeadline(format(date, 'yyyy-MM-dd'));
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter className="border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Add Countermeasure'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
