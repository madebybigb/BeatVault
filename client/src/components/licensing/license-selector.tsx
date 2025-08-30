import { useState } from 'react';
import { Check, Star, Crown, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { LICENSE_TIERS, type LicenseType, calculateLicensePrice } from '@shared/licensing';
import { cn } from '@/lib/utils';

interface LicenseSelectorProps {
  beatPrice: number;
  onLicenseSelect: (licenseType: LicenseType, price: number) => void;
  selectedLicense?: LicenseType;
  disabled?: boolean;
  className?: string;
}

const LICENSE_ICONS = {
  basic: Music,
  premium: Star,
  exclusive: Crown,
};

const LICENSE_COLORS = {
  basic: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
  premium: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
  exclusive: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
};

export function LicenseSelector({ 
  beatPrice, 
  onLicenseSelect, 
  selectedLicense, 
  disabled,
  className 
}: LicenseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLicenseSelect = (licenseType: LicenseType) => {
    const price = calculateLicensePrice(beatPrice, licenseType);
    onLicenseSelect(licenseType, price);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('w-full', className)}
          data-testid="license-selector-trigger"
        >
          {selectedLicense ? (
            <>
              {LICENSE_TIERS[selectedLicense].name} - ${calculateLicensePrice(beatPrice, selectedLicense)}
            </>
          ) : (
            'Choose License'
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Your License</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {(Object.keys(LICENSE_TIERS) as LicenseType[]).map((licenseType) => {
            const license = LICENSE_TIERS[licenseType];
            const price = calculateLicensePrice(beatPrice, licenseType);
            const Icon = LICENSE_ICONS[licenseType];
            const isSelected = selectedLicense === licenseType;
            const isPopular = licenseType === 'premium';

            return (
              <Card
                key={licenseType}
                className={cn(
                  'relative cursor-pointer transition-all duration-200 hover:shadow-lg',
                  LICENSE_COLORS[licenseType],
                  isSelected && 'ring-2 ring-primary ring-offset-2'
                )}
                onClick={() => handleLicenseSelect(licenseType)}
                data-testid={`license-card-${licenseType}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3">
                    <div className={cn(
                      'p-3 rounded-full',
                      licenseType === 'basic' && 'bg-blue-100 dark:bg-blue-900',
                      licenseType === 'premium' && 'bg-purple-100 dark:bg-purple-900',
                      licenseType === 'exclusive' && 'bg-yellow-100 dark:bg-yellow-900'
                    )}>
                      <Icon className={cn(
                        'h-6 w-6',
                        licenseType === 'basic' && 'text-blue-600 dark:text-blue-400',
                        licenseType === 'premium' && 'text-purple-600 dark:text-purple-400',
                        licenseType === 'exclusive' && 'text-yellow-600 dark:text-yellow-400'
                      )} />
                    </div>
                  </div>
                  
                  <CardTitle className="text-xl">{license.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">
                    ${price}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {license.description}
                  </p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">What's Included:</h4>
                    {license.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">License Terms:</h4>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <div>Commercial Use: {license.limitations.commercialUse ? 'Yes' : 'No'}</div>
                      {license.limitations.distributionLimit && (
                        <div>Distribution Limit: {license.limitations.distributionLimit.toLocaleString()}</div>
                      )}
                      <div>Producer Credit: {license.limitations.creditRequired ? 'Required' : 'Not Required'}</div>
                      <div>Exclusivity: {license.limitations.exclusivity ? 'Exclusive' : 'Non-Exclusive'}</div>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4"
                    variant={isSelected ? 'default' : 'outline'}
                    data-testid={`select-license-${licenseType}`}
                  >
                    {isSelected ? 'Selected' : `Select ${license.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">License Comparison</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>Basic:</strong> Perfect for demos, non-commercial projects, and getting started</p>
            <p>• <strong>Premium:</strong> Ideal for commercial releases, radio play, and professional use</p>
            <p>• <strong>Exclusive:</strong> Complete ownership, beat removed from sale, unlimited rights</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}