# Polonia Cemetery

An online genealogy reference for Polonia Cemetery in Caldwell County, Texas. This project provides a searchable directory of grave markers with photographs and an interactive map showing marker locations.

## About Polonia Cemetery

The three-acre tract of land that was the Polish settlement of Polonia was deeded to Bishop John Neraz of the Catholic Diocese of San Antonio in 1894 by Joseph and Veronica Dzierzanowski. The community was founded one year after the death of Simon Dzierzanowski (1853-1896), who was the first to be buried in his family's cemetery on this site.

The settlement once boasted a cotton gin, blacksmith shop, general store, and the Sacred Heart Catholic Church. Schools for both English and Spanish speaking students were built. The Polish population retained many traditions from their homeland. Polonia declined in the late 1930s because of a failing farm economy. The Catholic church was razed in 1939.

The Dzierzanowski Family Cemetery, now Polonia Community Cemetery, is the last reminder of the once vibrant village. Twenty-five percent of those buried in the cemetery are veterans of the United States Armed Forces.

### First Known Families of Polonia (1891)

Bienek, Boniewiez, Bonkowski, Dedek, Dikowski, Dykowski, Dzierzanowski, Foerster, Foryszewski, Grabarkewitz, Kalinowski, Krzywosinski, Levandowski, Malinowski, Petroski, Pieniazek, Reisner, Scholwinski, Slawinski, Urbanski, Wacluwczyk, Wisniewski, Zaleski, Zarrasky, Zawadski, and Zolewski.

## Features

- **Searchable Directory**: Browse and search all recorded names by surname or given name
- **Photo Archive**: View photographs of headstones and grave markers
- **Interactive Map**: Explore the cemetery layout with clickable markers showing grave locations
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
polonia/
├── index.html          # Main directory page
├── map.html            # Interactive cemetery map
├── assets/
│   ├── app.js          # Application JavaScript
│   ├── records.js      # Cemetery records data
│   └── styles.css      # Stylesheet
└── images/             # Headstone photographs and map assets
```

## Data Format

Records are stored in `assets/records.js` with the following structure:

```javascript
{
  "last_name": "Surname",
  "first_name": "Given Name",
  "birth_date": "Month Day, Year",
  "death_date": "Month Day, Year",
  "photos": ["0001-1.jpg", "0001-2.jpg"],
  "coords": { "lat": 29.940123, "lon": -97.705678 },
  "inscription": ["Line 1", "Line 2"]
}
```

## Development

This is a static site with no build process required. To run locally:

1. Clone the repository
2. Serve the files with any static file server
3. Open `index.html` in a browser

Example using Python:
```bash
python -m http.server 8000
```

## Contributing

Contributions are welcome! If you have corrections, additional photographs, or information about individuals buried at Polonia Cemetery:

1. Open an issue or discussion on GitHub
2. Submit a pull request with your changes

## License

- **Site code**: [MIT License](LICENSE)
- **Content (photographs, data)**: [Creative Commons Attribution 4.0](CONTENT_LICENSE.txt)

## Acknowledgments

This project was created to preserve the history of the Polonia community and assist family researchers in their genealogy work.
