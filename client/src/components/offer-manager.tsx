
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface OfferManagerProps {
  open: boolean;
  onClose: () => void;
}

interface Offer {
  id: string;
  offerName: string;
  description?: string;
  isActive: boolean;
  durationDays: number;
  durationMonths: number;
  autoApproval: boolean;
  maxBots?: number;
  currentUsage: number;
  startTime?: string;
  endTime?: string;
  createdBy: string;
  createdAt: string;
}

export default function OfferManager({ open, onClose }: OfferManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    offerName: "",
    description: "",
    durationDays: 0,
    durationMonths: 1,
    autoApproval: true,
    maxBots: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all offers
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["/api/admin/offers"],
    enabled: open
  });

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (offerData: any) => {
      const response = await apiRequest("POST", "/api/admin/offers/create", offerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offer/current"] });
      setShowCreateModal(false);
      setFormData({
        offerName: "",
        description: "",
        durationDays: 0,
        durationMonths: 1,
        autoApproval: true,
        maxBots: ""
      });
      toast({ title: "Offer created successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create offer", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Stop current offer mutation
  const stopOfferMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/offers/stop-current");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offer/current"] });
      toast({ title: "Current offer stopped successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to stop offer", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/offers/${offerId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offer/current"] });
      toast({ title: "Offer deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete offer", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleCreateOffer = () => {
    if (!formData.offerName.trim()) {
      toast({ title: "Offer name is required", variant: "destructive" });
      return;
    }

    if (formData.durationDays === 0 && formData.durationMonths === 0) {
      toast({ title: "Duration must be greater than 0", variant: "destructive" });
      return;
    }

    createOfferMutation.mutate({
      ...formData,
      maxBots: formData.maxBots ? parseInt(formData.maxBots) : undefined
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const activeOffer = offers.find((offer: Offer) => offer.isActive);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              🎁 Offer Manager
            </DialogTitle>
          </DialogHeader>

          {/* Current Active Offer */}
          {activeOffer && (
            <Card className="bg-gradient-to-r from-green-600 to-emerald-600 border-none text-white mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>🚀 Active Offer</span>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-lg">{activeOffer.offerName}</h4>
                    {activeOffer.description && (
                      <p className="text-green-100 text-sm mt-1">{activeOffer.description}</p>
                    )}
                    <div className="mt-3 space-y-1 text-sm">
                      <p>⏱️ Duration: {activeOffer.durationDays}d {activeOffer.durationMonths}m</p>
                      <p>✅ Auto Approval: {activeOffer.autoApproval ? "Yes" : "No"}</p>
                      {activeOffer.maxBots && (
                        <p>🤖 Max Bots: {activeOffer.currentUsage}/{activeOffer.maxBots}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {activeOffer.endTime && (
                      <div className="bg-white/20 rounded-lg p-3 mb-3">
                        <p className="text-sm text-green-100">Time Remaining</p>
                        <p className="text-lg font-bold">
                          {calculateTimeRemaining(activeOffer.endTime)}
                        </p>
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => stopOfferMutation.mutate()}
                      disabled={stopOfferMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {stopOfferMutation.isPending ? "Stopping..." : "🛑 Stop Offer"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Offer Management</h3>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              🎁 Create New Offer
            </Button>
          </div>

          {/* Offers List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : offers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No offers created yet</p>
                </CardContent>
              </Card>
            ) : (
              offers.map((offer: Offer) => (
                <Card key={offer.id} className={offer.isActive ? "border-green-500" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {offer.offerName}
                              {offer.isActive && (
                                <Badge variant="default" className="bg-green-600 text-white">
                                  Active
                                </Badge>
                              )}
                            </h4>
                            {offer.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {offer.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                              <span>⏱️ {offer.durationDays}d {offer.durationMonths}m</span>
                              <span>✅ Auto: {offer.autoApproval ? "Yes" : "No"}</span>
                              {offer.maxBots && (
                                <span>🤖 {offer.currentUsage}/{offer.maxBots} used</span>
                              )}
                              <span>📅 Created: {formatDate(offer.createdAt)}</span>
                              {offer.endTime && offer.isActive && (
                                <span>⏰ Ends: {calculateTimeRemaining(offer.endTime)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!offer.isActive && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                🗑️ Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{offer.offerName}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteOfferMutation.mutate(offer.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Offer Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎁 Create New Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="offerName">Offer Name *</Label>
              <Input
                id="offerName"
                value={formData.offerName}
                onChange={(e) => setFormData(prev => ({ ...prev, offerName: e.target.value }))}
                placeholder="e.g., Spring Special Offer"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description of the offer..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="durationDays">Duration (Days)</Label>
                <Input
                  id="durationDays"
                  type="number"
                  min="0"
                  value={formData.durationDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationDays: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="durationMonths">Duration (Months)</Label>
                <Input
                  id="durationMonths"
                  type="number"
                  min="0"
                  value={formData.durationMonths}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMonths: parseInt(e.target.value) || 0 }))}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="autoApproval"
                checked={formData.autoApproval}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoApproval: checked }))}
              />
              <Label htmlFor="autoApproval">Auto-approve bots during offer</Label>
            </div>

            <div>
              <Label htmlFor="maxBots">Max Bots (Optional)</Label>
              <Input
                id="maxBots"
                type="number"
                min="1"
                value={formData.maxBots}
                onChange={(e) => setFormData(prev => ({ ...prev, maxBots: e.target.value }))}
                placeholder="Leave empty for unlimited"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum number of bots that can use this offer
              </p>
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handleCreateOffer}
                disabled={createOfferMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createOfferMutation.isPending ? "Creating..." : "🎁 Create Offer"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
