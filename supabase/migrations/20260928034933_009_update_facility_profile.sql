-- Update facility profile to correct values
UPDATE facilities
SET name = 'Green Recycling Facility',
    state = 'Andhra Pradesh',
    district = 'East Godavari',
    address = NULL
WHERE id = 'b0000000-0000-0000-0000-000000000001';
