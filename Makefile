# AIKYAM Website - Build & Development Tasks
# Usage: make [target]

.PHONY: help serve optimize minify build clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

serve: ## Start local dev server on port 8000
	@echo "Starting AIKYAM dev server at http://localhost:8000"
	python3 -m http.server 8000

optimize: ## Optimize all images (people, branding, events)
	python3 tools/optimize_all_images.py

optimize-dry: ## Preview image optimization (no changes)
	python3 tools/optimize_all_images.py --dry-run

minify: ## Minify CSS and JS for production
	@echo "Minifying CSS..."
	@python3 -c "\
	import re, sys; \
	css = open('styles.css').read(); \
	css = re.sub(r'/\*[\s\S]*?\*/', '', css); \
	css = re.sub(r'\s*\n\s*', '\n', css); \
	css = re.sub(r'\s*([{}:;,>~+])\s*', r'\1', css); \
	css = re.sub(r';\s*}', '}', css); \
	css = re.sub(r'\n+', '\n', css).strip(); \
	open('styles.min.css', 'w').write(css); \
	orig = len(open('styles.css').read()); \
	print(f'  styles.css: {orig//1024}KB -> {len(css)//1024}KB ({100-len(css)*100//orig}% smaller)') \
	"
	@echo "Minifying JS..."
	@python3 -c "\
	import re; \
	js = open('script.js').read(); \
	js = re.sub(r'//[^\n]*', '', js); \
	js = re.sub(r'/\*[\s\S]*?\*/', '', js); \
	js = re.sub(r'\n\s*\n+', '\n', js); \
	js = js.strip(); \
	open('script.min.js', 'w').write(js); \
	orig = len(open('script.js').read()); \
	print(f'  script.js: {orig//1024}KB -> {len(js)//1024}KB ({100-len(js)*100//orig}% smaller)') \
	"
	@echo "Minifying auth JS..."
	@python3 -c "\
	import re; \
	js = open('auth.js').read(); \
	js = re.sub(r'//[^\n]*', '', js); \
	js = re.sub(r'/\*[\s\S]*?\*/', '', js); \
	js = re.sub(r'\n\s*\n+', '\n', js); \
	js = js.strip(); \
	open('auth.min.js', 'w').write(js); \
	orig = len(open('auth.js').read()); \
	print(f'  auth.js: {orig//1024}KB -> {len(js)//1024}KB ({100-len(js)*100//orig}% smaller)') \
	"
	@echo "Minifying events JS..."
	@python3 -c "\
	import re; \
	js = open('events.js').read(); \
	js = re.sub(r'//[^\n]*', '', js); \
	js = re.sub(r'/\*[\s\S]*?\*/', '', js); \
	js = re.sub(r'\n\s*\n+', '\n', js); \
	js = js.strip(); \
	open('events.min.js', 'w').write(js); \
	orig = len(open('events.js').read()); \
	print(f'  events.js: {orig//1024}KB -> {len(js)//1024}KB ({100-len(js)*100//orig}% smaller)') \
	"
	@echo "Minifying admin-events JS..."
	@python3 -c "\
	import re; \
	js = open('admin-events.js').read(); \
	js = re.sub(r'//[^\n]*', '', js); \
	js = re.sub(r'/\*[\s\S]*?\*/', '', js); \
	js = re.sub(r'\n\s*\n+', '\n', js); \
	js = js.strip(); \
	open('admin-events.min.js', 'w').write(js); \
	orig = len(open('admin-events.js').read()); \
	print(f'  admin-events.js: {orig//1024}KB -> {len(js)//1024}KB ({100-len(js)*100//orig}% smaller)') \
	"
	@for f in team.js vendors-data.js gallery-data.js admin-team.js admin-vendors.js admin-gallery.js; do \
		echo "Minifying $$f..."; \
		python3 -c "\
import re, sys; \
js = open('$$f').read(); \
js = re.sub(r'//[^\n]*', '', js); \
js = re.sub(r'/\*[\s\S]*?\*/', '', js); \
js = re.sub(r'\n\s*\n+', '\n', js); \
js = js.strip(); \
name = '$$f'.replace('.js', '.min.js'); \
open(name, 'w').write(js); \
orig = len(open('$$f').read()); \
print(f'  $$f: {orig//1024}KB -> {len(js)//1024}KB ({100-len(js)*100//orig}% smaller)') \
"; \
	done
	@echo "Done! All JS and CSS files minified for production."

build: optimize minify ## Full production build (optimize + minify)
	@echo "\nBuild complete!"

clean: ## Remove generated optimized/minified files
	rm -f styles.min.css script.min.js auth.min.js events.min.js admin-events.min.js
	rm -f team.min.js vendors-data.min.js gallery-data.min.js admin-team.min.js admin-vendors.min.js admin-gallery.min.js
	rm -f assets/branding/BgImage.webp assets/branding/BgImage-1200.webp assets/branding/logo.webp
	rm -f assets/people/*-opt.webp assets/people/*-opt.jpeg
	@echo "Cleaned generated files."
