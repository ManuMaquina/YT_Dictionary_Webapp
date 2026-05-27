import { Component } from '@angular/core';

@Component({
  selector: 'app-dictionary',
  standalone: true,
  template: `
    <div class="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Dictionary</h1>
      <p class="text-gray-500">Word listings — coming in Phase 2.</p>
    </div>
  `,
})
export class DictionaryComponent {}
