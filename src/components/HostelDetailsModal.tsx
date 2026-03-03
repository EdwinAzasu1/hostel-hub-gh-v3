import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, Mail, Users, DollarSign, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Hostel } from '@/types/hostel';
import { HostelReviews } from './HostelReviews';

interface HostelDetailsModalProps {
  hostel: Hostel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HostelDetailsModal = ({ hostel, open, onOpenChange }: HostelDetailsModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);

  const images = hostel?.images || [];
  const hasMultipleImages = images.length > 1;

  const goToPrevious = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImageIndex !== null) {
      setCurrentImageIndex(currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1);
    }
  }, [currentImageIndex, images.length]);

  const goToNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentImageIndex !== null) {
      setCurrentImageIndex(currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1);
    }
  }, [currentImageIndex, images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (currentImageIndex === null) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentImageIndex(currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1);
      } else if (e.key === 'ArrowRight') {
        setCurrentImageIndex(currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1);
      } else if (e.key === 'Escape') {
        setCurrentImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImageIndex, images.length]);

  if (!hostel) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{hostel.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Images */}
            {hostel.images && hostel.images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hostel.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${hostel.name} - Image ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setCurrentImageIndex(index)}
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">No images available</p>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">About</h3>
                <p className="text-muted-foreground">{hostel.description}</p>
              </div>

              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{hostel.address}</span>
                {hostel.googleMapsLink && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 p-1 h-auto"
                    onClick={() => window.open(hostel.googleMapsLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Room Types and Pricing */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Room Types & Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hostel.roomTypes.map((room) => (
                  <div key={room.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{room.type}</h4>
                      <Badge variant={room.availableRooms > 0 ? "default" : "secondary"}>
                        {room.availableRooms} Available
                      </Badge>
                    </div>
                    <div className="flex items-center text-accent font-semibold">
                      <DollarSign className="h-4 w-4 mr-1" />
                      ₵{room.pricePerStudent}/student
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">₵{hostel.startingPrice}</div>
                <div className="text-sm text-muted-foreground">Starting from</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center text-2xl font-bold">
                  <Users className="h-6 w-6 mr-1" />
                  {hostel.totalRooms}
                </div>
                <div className="text-sm text-muted-foreground">Total Rooms</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{hostel.availableRooms}</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </div>

            <Separator />

            {/* Manager Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-24 text-sm text-muted-foreground">Manager:</div>
                  <div className="font-medium">{hostel.managerName}</div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={`tel:${hostel.managerPhone}`}
                    className="text-accent hover:underline"
                  >
                    {hostel.managerPhone}
                  </a>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={`mailto:${hostel.managerEmail}`}
                    className="text-accent hover:underline"
                  >
                    {hostel.managerEmail}
                  </a>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <HostelReviews hostelId={hostel.id} />

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button 
                className="flex-1"
                onClick={() => window.open(`tel:${hostel.managerPhone}`, '_self')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Manager
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.open(`mailto:${hostel.managerEmail}`, '_self')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {currentImageIndex !== null && images[currentImageIndex] && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setCurrentImageIndex(null)}
        >
          {/* Left Arrow */}
          {hasMultipleImages && (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1);
              }}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <img
            src={images[currentImageIndex]}
            alt={`${hostel.name} - Image ${currentImageIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain rounded-lg cursor-pointer"
          />

          {/* Right Arrow */}
          {hasMultipleImages && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1);
              }}
              aria-label="Next image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Image Counter */}
          {hasMultipleImages && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm pointer-events-none">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
};
