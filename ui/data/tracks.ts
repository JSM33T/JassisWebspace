export interface TrackLink {
	type: 'spotify' | 'soundcloud' | 'youtube' | 'bandcamp' | 'itunes' | 'download' | 'stream';
	url: string;
	label: string;
}

export interface Artist {
	name: string;
	url?: string;
	role?: 'featuring' | 'remix' | 'collaboration' | 'producer';
}

export interface Track {
	id: string;
	title: string;
	description: string;
	artists: Artist[];
	category: 'remixes' | 'originals' | 'snippets' | 'features' | 'collaborations' | 'covers';
	duration?: string;
	releaseDate: string;
	genre?: string;
	tags: string[];
	coverArt: string;
	links: TrackLink[];
	featured: boolean;
	playFile?: string; // Direct audio file URL for the global music player
	waveformUrl?: string;
}

export const musicTracks: Track[] = [
	{
		id: 'melancholy_original',
		title: 'Melancholy (Original Mix)',
		description: 'An electronic masterpiece that captures the essence of adventure and mystery in gaming.',
		artists: [
			{ name: 'JSM33T', url: '' }
		],
		category: 'originals',
		duration: '3:42',
		releaseDate: '2020-09-20',
		genre: 'Orchestral',
		tags: ['orchestral', 'ambient', 'epic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/melancholy.jpg',
		featured: false,
		links: [
			{
				type: 'youtube',
				url: 'https://www.youtube.com/watch?v=6fO-OaYfAyM',
				label: 'Listen on YouTube'
			},
			{
				type: 'spotify',
				url: 'https://open.spotify.com/track/2LlXsMXbXJiFjPxniFA1aB',
				label: 'Stream on Spotify'
			},
			{
				type: 'soundcloud',
				url: 'https://soundcloud.com/jsm33t/melancholy',
				label: 'Listen on SoundCloud'
			},
			{
				type: 'soundcloud',
				url: 'https://www.amazon.com/Melancholy-Jsm33t/dp/B08F74JGRW',
				label: 'Buy on Amazon'
			},
		]
	},
	{
		id: 'singularity',
		title: 'Singularity (Original Mix)',
		description: 'A dreamy ambient track that takes you on a journey through nature\'s most beautiful transformations.',
		artists: [
			{ name: 'JSM33T', url: '' }
		],
		category: 'originals',
		duration: '4:18',
		releaseDate: '2023-05-20',
		genre: 'Ambient',
		tags: ['ambient', 'nature', 'dreamy', 'meditation'],
		coverArt: 'https://cdn.jsm33t.com/media/images/singularity.jpg',
		featured: false,
		links: [
			{
				type: 'youtube',
				url: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg',
				label: 'Watch on YouTube'
			},
			{
				type: 'spotify',
				url: 'https://open.spotify.com/track/example2',
				label: 'Stream on Spotify'
			},
			{
				type: 'bandcamp',
				url: 'https://epoq.bandcamp.com/track/lepidoptera',
				label: 'Buy on Bandcamp'
			}
		]
	},
	{
		id: 'tu-hai-ki-nahi',
		title: 'Tu Hai Ki Nahi (Remix)',
		description: 'A deep house remix that transforms the original into a dancefloor anthem.',
		artists: [
			{ name: 'JSM33T', url: 'https://example.com/original' },
			{ name: 'Sai SUnder', role: 'featuring', url: '/' }
		],
		category: 'remixes',
		duration: '5:23',
		releaseDate: '2019-08-01',
		genre: 'Electronic',
		tags: ['electronic', 'remix', 'dance'],
		coverArt: 'https://cdn.jsm33t.com/media/images/tu_hai_ki_nahi.jpg',
		featured: false,
		links: [
			// {
			// 	type: 'soundcloud',
			// 	url: 'https://soundcloud.com/jsm33t/midnight-vibes-remix',
			// 	label: 'Listen on SoundCloud'
			// }
		]
	},
	{
		id: 'so-far-away-remix',
		title: 'So Far Away (Remix)',
		description: 'A house remix that transforms the original into a dancefloor anthem.',
		artists: [
			{ name: 'JSM33T', url: '/' },
		],
		category: 'remixes',
		duration: '5:23',
		releaseDate: '2018-12-01',
		genre: 'Electronic',
		tags: ['electronic', 'remix', 'dance'],
		coverArt: 'https://cdn.jsm33t.com/media/images/so_far_away_remix.png',
		featured: false,
		links: [
			{
				type: 'soundcloud',
				url: 'https://soundcloud.com/jsm33t/so-far-away-remix',
				label: 'Listen on SoundCloud'
			}
		]
	},
	{
		id: 'titli-dnb-remix',
		title: 'Titli (DnB Remix)',
		description: 'A high-energy drum & bass remix of the soulful original.',
		artists: [
			{ name: 'JSM33T', url: '/' },
		],
		category: 'remixes',
		duration: '4:58',
		releaseDate: '2021-07-15',
		genre: 'Drum & Bass',
		tags: ['dnb', 'remix', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos3.jpg',
		featured: false,
		links: [
			{
				type: 'soundcloud',
				url: 'https://soundcloud.com/jsm33t/titli-dnb-remix',
				label: 'Listen on SoundCloud'
			}
		]
	},
	{
		id: 'bulleya-dnb-remix',
		title: 'Bulleya (DnB Remix)',
		description: 'A driving drum & bass remix that reimagines the rock classic for the rave floor.',
		artists: [
			{ name: 'JSM33T', url: '/' },
		],
		category: 'remixes',
		duration: '5:12',
		releaseDate: '2021-03-10',
		genre: 'Drum & Bass',
		tags: ['dnb', 'remix', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos3.jpg',
		featured: false,
		links: [
			{
				type: 'soundcloud',
				url: 'https://soundcloud.com/jsm33t/bulleya-dnb-remix',
				label: 'Listen on SoundCloud'
			}
		]
	},
	{
		id: 'kabhi-jo-badal-barse-dnb-remix',
		title: 'Kabhi Jo Baadal Barse (Orchestral Rendition)',
		description: 'An emotional orchestral-inspired drum & bass remix with lush textures and driving energy.',
		artists: [
			{ name: 'JSM33T', url: '/' },
		],
		category: 'remixes',
		duration: '5:05',
		releaseDate: '2021-02-20',
		genre: 'Drum & Bass',
		tags: ['dnb', 'remix', 'orchestral', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos3.jpg',
		featured: false,
		links: [
			{
				type: 'soundcloud',
				url: 'https://soundcloud.com/jsm33t/kabhi-jo-badal-barse-dnb-remix',
				label: 'Listen on SoundCloud'
			}
		]
	},
	{
		id: 'bekhayali-dnb-remix',
		title: 'Bekhayali (DnB Remix)',
		description: 'A powerful drum & bass remix of the emotional ballad, blending intensity with melody.',
		artists: [
			{ name: 'JSM33T', url: '/' },
		],
		category: 'snippets',
		duration: '5:30',
		releaseDate: '2019-08-14',
		genre: 'Drum & Bass',
		tags: ['dnb', 'remix', 'emotional', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos3.jpg',
		featured: false,
		links: [
			{
				type: 'soundcloud',
				url: 'https://soundcloud.com/jsm33t/bekhayali-dnb-remix',
				label: 'Listen on SoundCloud'
			}
		]
	},
	{
		id: 'dhadak-dnb-remix',
		title: 'Dhadak (Orchestral Rendition)',
		description: 'An orchestral remix snippet.',
		artists: [
			{ name: 'JSM33T', url: '/' },
			{ name: 'Maraasim', url: '/' },
		],
		category: 'snippets',
		duration: '5:08',
		releaseDate: '2019-01-12',
		genre: 'Drum & Bass',
		tags: ['dnb', 'remix', 'romantic', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos3.jpg',
		featured: false,
		links: [
			{
				type: 'soundcloud',
				url: 'https://soundcloud.com/jsm33t/dhadak-dnb-remix',
				label: 'Listen on SoundCloud'
			}
		]
	},
	{
		id: 'pee-loon-remix',
		title: 'Pee Loon (Remix)',
		description: 'A melodic reimagining of the original with JSM33T’s signature touch.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:07',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/pee_loon_remix.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/pee-loon-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'hum-jee-lenge-remix',
		title: 'Hum Jee Lenge (Remix)',
		description: 'An energetic remix blending classic vocals with modern production.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '2:07',
		releaseDate: '2018-09-14',
		genre: 'Electronic',
		tags: ['remix', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos2.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/hum-jee-lenge-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'tu-jo-hai-remix',
		title: 'Tu Jo Hai (Remix)',
		description: 'A modern club-style remix with heavy beats and atmosphere.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:07',
		releaseDate: '2018-09-14',
		genre: 'Electronic',
		tags: ['remix', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos2.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/tu-jo-hai-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'tujhe-sochta-hoon-remix',
		title: 'Tujhe Sochta Hoon (Remix)',
		description: 'A heartfelt remix with soaring synths and rhythmic grooves.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:07',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/tujhe_sochta_hoon.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/tujhe-sochta-hoon-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'dil-de-diya-hai-remix',
		title: 'Dil De Diya Hai (Remix)',
		description: 'A collaboration with Lakshay, transforming the ballad into a remix anthem.',
		artists: [
			{ name: 'JSM33T', url: '/' },
			{ name: 'Lakshay', url: '/' }
		],
		category: 'remixes',
		duration: '5:06',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'collab', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos1.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/dil-de-diya-hai-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'how-deep-is-your-love-remix',
		title: 'How Deep Is Your Love (Remix)',
		description: 'A remix of the iconic track with pulsating basslines and festival energy.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:06',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'edm'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos1.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/how-deep-is-your-love-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'khair-mangdi-remix',
		title: 'Khair Mangdi (Remix)',
		description: 'An emotional yet energetic remix with melodic drum & bass vibes.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:06',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'emotional'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos1.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/khair-mangdi-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'wajah-tum-ho-remix',
		title: 'Wajah Tum Ho (Remix)',
		description: 'A dark and moody remix with atmospheric breakdowns and driving beats.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:06',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'dark', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos2.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/wajah-tum-ho-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'shape-of-you-remix',
		title: 'Shape Of You (Remix)',
		description: 'JSM33T reimagines the global hit with a dancefloor-ready remix.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:06',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'pop', 'edm'],
		coverArt: 'https://cdn.jsm33t.com/media/images/shape_of_you.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/shape-of-you-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'tujhe-bhula-diya-remix',
		title: 'Tujhe Bhula Diya (Remix)',
		description: 'An emotional remix with soaring synths and nostalgic melodies.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '6:06',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'emotional', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos2.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/tujhe-bhula-diya-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'pee-loon-extended-mix',
		title: 'Pee Loon (Extended Mix)',
		description: 'A longer extended mix designed for immersive listening.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:06',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'extended', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/pee_loon_remix.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/pee-loon-extended-mix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'humnava-mere-remix',
		title: 'Humnava Mere (Remix)',
		description: 'A soulful remix with deep emotional vibes layered over energetic beats.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:15',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'emotional', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos2.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/humnava-mere-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'tera-zikr-remix',
		title: 'Tera Zikr (Remix)',
		description: 'An uplifting remix blending heartfelt lyrics with a high-energy electronic drop.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'remixes',
		duration: '5:10',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['remix', 'romantic', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/recuerdos2.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/tera-zikr-remix', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'dj-vector-deep-house-podcast',
		title: 'DJ Vector – Deep House Podcast',
		description: 'A deep house podcast session by DJ Vector, featuring immersive grooves.',
		artists: [{ name: 'DJ Vector', url: '/' }],
		category: 'features',
		duration: '7:46',
		releaseDate: '2020-09-14',
		genre: 'Deep House',
		tags: ['podcast', 'deep house'],
		coverArt: 'https://cdn.jsm33t.com/media/images/radio.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/djvector/deep-house-podcast', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'electronyk-podcast-electronic-maestro',
		title: 'Electronyk Podcast – Electronic Maestro',
		description: 'An electrifying mix from Electronyk, blending electronic and dance sounds.',
		artists: [{ name: 'Electronyk', url: '/' }],
		category: 'features',
		duration: '6:23',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['podcast', 'electronic'],
		coverArt: 'https://cdn.jsm33t.com/media/images/radio.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/electronyk/electronic-maestro', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'radio-bulleya-dnb-remix',
		title: 'RadioMirchi 98.3fm – Bulleya DnB Remix',
		description: 'A drum & bass remix of Bulleya broadcasted on RadioMirchi.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'features',
		duration: '5:78',
		releaseDate: '2020-09-14',
		genre: 'Drum & Bass',
		tags: ['feature', 'radio', 'dnb'],
		coverArt: 'https://cdn.jsm33t.com/media/images/radio.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/bulleya-dnb-radio-feature', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'radio-pee-loon',
		title: 'RadioMirchi 98.3fm – Pee Loon',
		description: 'A special RadioMirchi feature of Pee Loon.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'features',
		duration: '4:34',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['feature', 'radio'],
		coverArt: 'https://cdn.jsm33t.com/media/images/radio.jpg',
		featured: false,
		links: [
			{ type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/pee-loon-radio-feature', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'radio-tujhe-bhula-diya',
		title: 'RadioMirchi 98.3fm – Tujhe Bhula Diya',
		description: 'RadioMirchi feature version of the emotional track Tujhe Bhula Diya.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'features',
		duration: '4:16',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['feature', 'radio'],
		coverArt: 'https://cdn.jsm33t.com/media/images/radio.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/tujhe-bhula-diya-radio-feature', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'radio-wajah-tum-ho',
		title: 'RadioMirchi 98.3fm – Wajah Tum Ho',
		description: 'RadioMirchi broadcast feature of Wajah Tum Ho remix.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'features',
		duration: '2:99',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['feature', 'radio'],
		coverArt: 'https://cdn.jsm33t.com/media/images/radio.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/wajah-tum-ho-radio-feature', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'radio-young-again',
		title: 'RadioMirchi 98.3fm – Young Again',
		description: 'An uplifting feature mix of Young Again aired on RadioMirchi.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'features',
		duration: '7:94',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['feature', 'radio'],
		coverArt: 'https://cdn.jsm33t.com/media/images/radio.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/young-again-radio-feature', label: 'Listen on SoundCloud' }
		]
	},
	{
		id: 'radio-zara-zara',
		title: 'RadioMirchi 98.3fm – Zara Zara',
		description: 'A soothing feature broadcast of Zara Zara on RadioMirchi.',
		artists: [{ name: 'JSM33T', url: '/' }],
		category: 'features',
		duration: '5:24',
		releaseDate: '2020-09-14',
		genre: 'Electronic',
		tags: ['feature', 'radio'],
		coverArt: 'https://cdn.jsm33t.com/media/images/radio.jpg',
		featured: false,
		links: [
			// { type: 'soundcloud', url: 'https://soundcloud.com/jsm33t/zara-zara-radio-feature', label: 'Listen on SoundCloud' }
		]
	},

];

export const musicCategories = [
	{ id: 'all', label: 'All Tracks', count: musicTracks.length },
	{ id: 'remixes', label: 'Remixes', count: musicTracks.filter(t => t.category === 'remixes').length },
	{ id: 'originals', label: 'Originals', count: musicTracks.filter(t => t.category === 'originals').length },
	{ id: 'features', label: 'Features', count: musicTracks.filter(t => t.category === 'features').length },
	{ id: 'snippets', label: 'Snippets', count: musicTracks.filter(t => t.category === 'snippets').length }

];

export const musicGenres = [
	'Electronic', 'Ambient', 'Deep House', 'R&B', 'Acoustic', 'Orchestral Electronic', 'Sound Effect'
];
