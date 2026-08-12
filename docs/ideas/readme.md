# Ideas

Do not work on this file. These are just ideas for later.

- See world map at different zoom levels
- See temparature hotspots during the year
- See cold/hot pressure fronts
- See wind speeds/direction
- See jet stream(s)
- See animation of weather for a day/week
- Setup hold/cold/dry/wet temperate zones
- Setup weather affected by various zones, mountains, rivers, oceans, land
- Map generation based on zones

- Bridge-style simulation to travel between worlds in a space ship.
- Mini-games that can be played separately, but still influence the world as a whole
  - Fishing
  - Racing
  - Casino
- Space Station
  - Tiny, or up to planetary sized
- Funny professions
  - Farting skills
    - Preference to eat foods related to flatulence
    - Funny types of combat
    - Constant jokes
    - Occasional farting sounds while walking
    - Protection from being attacked by stinky monsters
- Music Composition
  - Allow players to compose their own songs and copy/exchange
  - Allow players to setup their own music bank
  - Allow players to invent new instruments
- 2D map and min-map shadows/blacks out areas past visual obstructions
- Mini map should be circular
- Mini map should show +/- buttons on the outer rim
- right-clicking tile (2D/3D) should support interactivity such as a radial context menu/sub-menu where clicked to perform actions either that the game supports, or that the plugin has configured/registered. Things like
  Debug -> Model -> Inspect -> Lab (go to lab),
  Debug -> Model -> Inspect -> Report (Download a PDF report),
  Debug -> Model -> Inspect -> Download Data (Download a JSON file),
  Debug -> Model -> Export... (Dialog to download as a GLB, or a PNG image of the rendered model with full transparency. If animated, option to download as frames rendered as MP4)
  Debug -> Model -> Force LOD -> Fallback/Low/Med/High
  Debug -> Tile -> Configure... (dialog to copy/paste/edit parameters)
  Debug -> Tile -> Change... (dialog to change to other tyle type)
  Debug -> Music -> Inspect -> Lab (go to lab),
  Debug -> Model -> Inspect -> Report (Download a PDF report),
  Debug -> Model -> Inspect -> Download Data (Download a JSON file),
  Debug -> Music -> Export... (dialog to choose format as MIDI, MP3, OGG, etc.)
  Debug -> Music -> Configure... (Dialog to copy/paste/edit parameters via dialog)

| Need            | Library        | Why                                    |
| --------------- | -------------- | -------------------------------------- |
| Runtime schemas | Zod            | Validate JSON, plugins, saves, updates |
| Server/API data | TanStack Query | Cache Vite API and async debug data    |
| Icons           | Lucide         | Consistent control icons               |
| Browser tests   | Playwright     | Test the actual game/debug pages       |

different celestial bodies - constellations, moon, sun, comets, aurora, meteor shower, planets should proably be seprated into their own celestial plugins and have the ability to toggle on/off, and report/listen on some kind of event channel for calculations and such, but also be throttled so they don't get too noisy sending information out if they need to do so (ie, moon start/end phase/location, aurora on/off/position)

Add different geographic layers where areas of the world have a 0.0 to 1.0 influence of style/game play -

- Modern - Today (computers, internet, etc)
- Future - Teleportation, Robots, Space Stations, etc.
- Post Apocolyptic - Ruins
- Legends - Gods & Mythology
- Fantasy - Magic
- Steam Punk - Steam Engines & Westerns
- Wild West
  Tiles can take on various chracteristics based on support for different layers. Players can choose starting towns in areas heavily influenced by one thing or another.

Moss on trees facing away from equator

- Currency regions: Overlapping regions that accept/trade/buy with a particular currency

Oddities of Fun: Flea Circus, Barrel Organ/Organ Grinder, Puppet Show, Magician, Fortune Teller, Strong Man, Carnival Barker, Ticket Seller

- Speedometer
- Altimeter
- Flight Instruments 6-pack (steam gauges) or PFD (Glass Cockpit) + flight wall of aircraft in the area
- Look at how to control various transports to real life
  - Animal (Horse, Buggy, Stage Coach, Caravan)
  - Vehicle (Car, Bus, 18 Wheeler, Fire Engine, Law Enforcement, Race Car, Towtruck, RV, 5th Wheel Camper, Ambulance, Ice Cream Truck, Antique Car, Tractor, Parking lot tram)
  - Boats (Tall Ship, Sailing, Motor, Ship, Tug, Liner, Cruise, Paddle/Steam, Row, Kyak, Inner Tube, Foot paddle boat)
    - Docks, Harbors, Light Houses, Ship Yard, Freight Yard
    - Automated Routes - Ferry, Scenic, Tourism, Transport, Freight
  - Aircraft (747, 172, Experimental, Glider, Balloon)
    - Airport, Tower, Radar, Landing Strip, Landing Lights, Lights on tall towers, Flight Wall of Aircraft in area, Radio chatter, Runway numbers based on orientation and R/L
    - Automated Routes
    - Balloon Festivals, Air shows
  - Train (Trolly, Monorail, Steam, Electric, Deisel, Metro/Subway, Freight, Caboose)
    - Train yard, Signals, Caboose, Track switch, Signs
    - Automated Routes, Freight Delivery
  - Theme Park / Carnival Rides (operator / rider): Swings, Ferris Wheel, Meri-go-round, kids rides, Roller Coaster, Log Flume, Casino
    - Animal rides: Pony, Elephant, Horse, Donkey, Galapagos Turtle
