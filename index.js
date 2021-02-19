const
	cheerio = require('cheerio'),
	fs = require('fs'),
	rp = require('request-promise'),
	crypto = require('crypto'),
	https = require('https');
var
	images = [];

function loadChapter(url, fileName = 'chapter.html', chapterName, fullStory = "") {
	return new Promise((resolve, reject) => {
		var uri = "";
		var urlParts = url.split('/');
		uri = urlParts.slice(0, 3).join('/') + '/' + encodeURIComponent(urlParts[3]) + '/' + urlParts.slice(4, urlParts.length).join('/');
		console.log('Loading ' + uri);
		rp(uri, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:76.0) Gecko/20100101 Firefox/76.0'
			}
		}).then(html => {
			var $ = cheerio.load(html);
			var paragraphs = $('pre').children();

			if (fullStory === "") {
				fullStory += `<h1>${$('h2').html()}</h1>`;
			}

			for (let i = 0; i < paragraphs.length; i++) {
				const paragraph = paragraphs[i];
				var text = paragraph.firstChild.data;
				text = "";
				fullStory += '<p>';
				if (paragraph.tagName == 'figure') {
					images.push(paragraph.children[1].children[1].attribs.src);
					fullStory += '<img src=\'images/' + crypto.createHash('md5').update(paragraph.children[1].children[1].attribs.src).digest('hex') + '.png\'>';
				} else {
					paragraph.childNodes.forEach(node => {
						if (node.firstChild != null) {
							if (node.firstChild.name == 'i')
								fullStory += '<i>' + node.firstChild.firstChild.data + '</i>';
							if (node.firstChild.name == 'b')
								fullStory += '<b>' + node.firstChild.firstChild.data + '</b>';
							else
								fullStory += node.firstChild.data;
						}
						else if (node.tagName == 'br')
							fullStory += '<br>';
						else
							if (node.data != undefined)
								fullStory += node.data;
							else
								fullStory += `<iframe src='https://youtube.com/embed/${node.attribs['data-video-id']}'></iframe>`;
					});
				}
				fullStory += '</p>'
			}
			fs.writeFileSync('output/' + fileName, `<!DOCTYPE html><html><head>	<title>${chapterName}</title>	<meta charset='UTF-8'></head><body>	${fullStory}</body></html>`, { encoding: 'utf-8' });

			var nextPageButton = $('.load-more-page');
			if (nextPageButton.length > 0)
				loadChapter(nextPageButton.attr().href, fileName, chapterName, fullStory).then(resolve);
			else
				resolve();
		}).catch(err => console.log(err.message));
	})
}

async function loadBook(url) {
	var uri = "";
	var urlParts = url.split('/');
	uri = urlParts.slice(0, 3).join('/') + '/' + encodeURIComponent(urlParts[3]) + '/' + urlParts.slice(4, urlParts.length).join('/');
	console.log('Loading ' + uri);
	rp(uri, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:76.0) Gecko/20100101 Firefox/76.0'
		}
	}).then(async html => {
		var $ = cheerio.load(html);
		for (let i = 0; i < $('.table-of-contents').children().length; i++) {
			const chapter = $('.table-of-contents').children()[i];
			if (uri.startsWith('https://www.wattpad.com/story'))
				await loadChapter('https://www.wattpad.com' + chapter.children[1].attribs.href, 'Chapter ' + ('000' + (i + 1)).slice(-3) + '.html', chapter.children[1].firstChild.data.replace(/\n/gi, ""));
			else
				await loadChapter('https://www.wattpad.com' + chapter.children[1].attribs.href, 'Chapter ' + ('000' + (i + 1)).slice(-3) + '.html',  chapter.children[1].children[1].firstChild.data.replace(/\n/gi, ""));

		}
		console.log('Downloaded all chapters, starting images');
		downloadImages();
	}).catch(console.log);
}

function downloadImages(index = 0) {
	console.log('Downloading image from ' + images[index]);
	const file = fs.createWriteStream('output/images/' + crypto.createHash('md5').update(images[index]).digest('hex') + '.png');
	const request = https.get(images[index], function (response) {
		response.pipe(file);
	}).on('finish', () => {
		index++;
		if (index < images.length)
			downloadImages(index);
		else
			console.log('Complete!');
	});
}
try {
	fs.mkdirSync('output');
	fs.mkdirSync('output/images');
} catch (error) {

}

if (process.argv.length < 3) {
	console.log('Usage: node index.js <wattpad url>');
} else {
	loadBook(process.argv[2]);
}
