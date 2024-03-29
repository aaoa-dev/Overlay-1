import {chatters, chattersContainer, addChatter, removeChatter} from './chatters.js';


export const updateUI = () => {
    for (const child of chattersContainer.children) {
        if (!chatters.some((chatter) => chatter.user == child.id)) {
            removeChatter(child);
        }
    }
    for (const chatter of chatters) {
        if (![...chattersContainer.children].some((child) => child.id == chatter.user)) {
            addChatter(chatter);
        }
    }
};

export const resetUI = () => {
    chattersContainer.innerHTML = `<div id="aaoa_" class="aspect-square h-auto w-20 flex justify-center align-middle items-center bg-[#ff0055)] text-5xl font-extrabold text-white rounded-full">
    A
    </div>`;
  };