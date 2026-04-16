# Cagnotte Create/Edit Step 2 — Calendar OPEN state (NEW)

Source: Banani `CreateSolidaireCagnotteStep2CalendarOpen.jsx` (7571 chars).

**Delta detection:** this file is NEW in the latest Banani fetch. The previous fetch only had `CreateSolidaireCagnotteStep2.jsx` (the closed state). This is the matching open-calendar screen the user asked for (bug #11 — "Calendar on edit form not styled").

## Relevance to user bugs

- **Bug #11 (Calendar styling):** YES — provides the exact popover markup, grid, header buttons, colors.
- **Bug #10 (Visibility missing on edit form):** NO — this is Step 2 (end date). Visibility lives on a different step; not in this fetch.

## Full component (verbatim)

```jsx
import Icon from '@global/Icon';

export const displayName = 'CreateSolidaireCagnotteStep2CalendarOpen';
export default function CreateSolidaireCagnotteStep2CalendarOpen() {
  return (
    <section className="bg-white min-h-[calc(100vh-80px)] py-12 px-4 flex justify-center items-start">
      <div className="w-full max-w-2xl mt-8">
        
        {/* Progress and Back */}
        <div className="flex items-center justify-between mb-10">
          <button className="flex items-center gap-2 text-[#172866] font-bold hover:underline">
            <Icon i="arrow-left" size={20} />
            Retour
          </button>
          <div className="flex gap-2">
            <div className="w-8 h-2 bg-[#172866] rounded-full"></div>
            <div className="w-8 h-2 bg-[#172866] rounded-full"></div>
            <div className="w-8 h-2 bg-gray-200 rounded-full"></div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FEF4E3] text-[#172866] px-4 py-1.5 rounded-full font-bold text-sm mb-4 shadow-sm border border-[#f5ead5]">
            <span className="text-lg">❤️</span> Cagnotte Solidaire
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#172866] mb-3">
            Personnalisez votre projet
          </h1>
          <p className="text-gray-500 font-medium text-lg">
            Ajoutez une image et expliquez pourquoi vous collectez des fonds.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-8">
          
          {/* Image Upload - Dimmed */}
          <div className="opacity-40 pointer-events-none">
            <label className="block text-sm font-bold text-[#172866] mb-3">
              Photo de couverture <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-white shadow-sm">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-[#172866] mb-4">
                <Icon i="upload-cloud" size={32} />
              </div>
              <div className="font-bold text-[#172866] mb-1">Cliquez pour ajouter une photo</div>
              <div className="text-sm text-gray-500">ou glissez-déposez la ici (JPG, PNG)</div>
            </div>
          </div>

          {/* Description - Dimmed */}
          <div className="opacity-40 pointer-events-none">
            <div className="flex justify-between mb-2">
              <label className="block text-sm font-bold text-[#172866]">
                Description du projet <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="border border-gray-300 rounded-xl p-4 min-h-[160px] bg-white shadow-sm flex flex-col">
              <div className="text-gray-400 flex-1">
                Expliquez l'histoire de votre projet, à quoi serviront les fonds et pourquoi chaque don compte...
              </div>
            </div>
          </div>
          
          {/* Deadline - CALENDAR OPEN STATE */}
          <div className="relative z-50">
            <div className="flex justify-between mb-2">
              <label className="block text-sm font-bold text-[#172866]">
                Date de fin
              </label>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Optionnel</span>
            </div>

            {/* Calendar Popup - Positioned ABOVE */}
            <div className="absolute bottom-full left-0 mb-3 w-[320px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-5">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-4">
                <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[#172866] rounded-full transition-colors">
                  <Icon i="chevron-left" size={20} />
                </button>
                <div className="font-black text-[#172866] text-lg">Novembre 2023</div>
                <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[#172866] rounded-full transition-colors">
                  <Icon i="chevron-right" size={20} />
                </button>
              </div>
              
              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-1 text-center mb-3 border-b border-gray-100 pb-2">
                {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (
                  <div key={d} className="text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
                ))}
              </div>
              
              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium">
                {/* Empty cells for offset */}
                <div className="p-2 text-gray-300">30</div>
                <div className="p-2 text-gray-300">31</div>
                
                {/* Days */}
                {[...Array(30)].map((_, i) => {
                  const day = i + 1;
                  const isPast = day < 12;
                  const isToday = day === 12;
                  const isSelected = day === 25;
                  
                  return (
                    <div key={day} className={`p-2 rounded-full w-10 h-10 mx-auto flex items-center justify-center cursor-pointer transition-colors
                      ${isPast ? 'text-gray-300' : ''}
                      ${!isPast && !isSelected && !isToday ? 'text-[#172866] hover:bg-blue-50' : ''}
                      ${isToday && !isSelected ? 'bg-gray-100 text-[#172866] font-bold' : ''}
                      ${isSelected ? 'bg-[#172866] text-white font-black shadow-md' : ''}
                    `}>
                      {day}
                    </div>
                  )
                })}
              </div>
              
              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
                <button className="text-sm font-bold text-gray-500 hover:text-red-500 transition-colors">
                  Effacer
                </button>
                <button className="text-sm font-bold text-[#172866] bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                  Appliquer
                </button>
              </div>
            </div>

            {/* Input Element */}
            <div className="border-2 border-[#172866] ring-4 ring-blue-50 rounded-xl px-4 py-3.5 bg-white text-[#172866] font-bold flex justify-between items-center shadow-sm relative z-10 cursor-pointer">
              <span>25 Novembre 2023</span>
              <Icon i="calendar" size={20} className="text-[#172866]" />
            </div>
            
            <p className="text-xs text-gray-500 mt-2 font-medium opacity-40">Laissez vide si votre collecte est à durée indéterminée.</p>
          </div>

        </div>

        {/* Footer Actions - Dimmed */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-end opacity-40 pointer-events-none">
          <button className="bg-[#172866] text-white px-8 py-4 font-bold rounded-xl shadow-lg flex items-center gap-2">
            Étape suivante
            <Icon i="arrow-right" size={20} />
          </button>
        </div>

      </div>
    </section>
  );
}

```
