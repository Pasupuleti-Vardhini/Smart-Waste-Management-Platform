#♻️ Smart Waste Management Platform

## Overview

The Smart Waste Management Platform is a web-based application designed to streamline household waste collection, AI-based waste segregation, recycling facility operations, and inventory management. It connects households with waste management facilities through two integrated portals: the Household Portal and the Company Management Portal.

## Key Features

- Household Portal: Registration, waste collection requests, collection tracking, rewards, and personal history.
- Management Dashboard: Monitor collection activities, facility operations, and performance statistics.
- AI Waste Detection: Classify plastic, organic, metal, fabric, and electronic waste.
- Manual Review: Verify low-confidence AI classifications and correct predictions.
- Collection Management: Manage requests from submission through assignment, pickup, collection, and completion.
- Waste Receiving: Record incoming waste types and quantities.
- Smart Bins: Monitor bin status and capacity information.
- Storage & Inventory: Track stored, available, processed, and dispatched materials.
- Material Requirements: Manage facility material needs and their status.
- Dispatch Management: Record outgoing recyclable materials and update inventory.
- Rewards System: Calculate household rewards based on actual collected quantities.
- Analytics & Reports: Review operational information and waste management activities.
- Security: Supabase authentication, role-based access, and Row Level Security (RLS).

## Waste Categories

Waste Type| Bin Color
Plastic| Blue
Organic| Green
Metal| Black/Grey
Fabric| Yellow
E-Waste| Orange

The AI classification workflow uses a 70% confidence threshold, with lower-confidence predictions sent for manual review.

## Reward System

- Wet waste: ₹2 per kg
- Dry waste: ₹5 per kg

Rewards are calculated from actual collected quantities and credited to the relevant household account when the collection is completed.

## Technology Stack

- Development Platform: Bolt.new
- Backend and Database: Supabase
- Authentication: Supabase Authentication
- Database Security: Row Level Security (RLS)
- Frontend: Technologies used in the project source code
- Version Control: GitHub

## System Workflow

1. Households submit waste collection requests.
2. Management assigns and schedules collections.
3. Collection personnel record the actual collected quantity.
4. AI Detection classifies waste images, with manual review for uncertain predictions.
5. The facility records received waste and manages inventory.
6. Recyclable materials are dispatched according to facility requirements.
7. Completed collections update household records and eligible rewards.

## Future Enhancements

- Improved AI classification accuracy.
- Real-time IoT smart-bin integration.
- Automated notifications and collection reminders.
- Collection route optimisation.
- Advanced waste analytics and recycling insights.

## Security Note

Never upload private API keys, passwords, Supabase service-role keys, or ".env" files containing secrets to a public GitHub repository.

---

Building a cleaner and more sustainable future through technology and responsible waste management. ♻️
