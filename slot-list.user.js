// ==UserScript==
// @name         BattleXO Slot List to Discord Bot (Render API)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Show only "Send to Discord" button and send slot list to a Discord bot server API (hosted e.g. on Render). No data is shown on the webpage.
// @author       Vaibhav Raj
// @match        *https://og.battlexo.com/playoff/tournaments*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const BOT_ENDPOINT_URL = 'https://slot-list.onrender.com/api/send-slots';

    const style = document.createElement('style');
    style.textContent = `
        .slot-list-discord-btn {
            position: fixed;
            bottom: 25px;
            right: 25px;
            padding: 12px 22px;
            background-color: #5865f2;
            color: #fff;
            border: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            z-index: 99999;
            box-shadow: 0 2px 10px rgba(44,55,139,0.2);
        }
    `;
    document.head.appendChild(style);

    const discordBtn = document.createElement('button');
    discordBtn.textContent = 'Send Slot List to Discord';
    discordBtn.className = 'slot-list-discord-btn';
    document.body.appendChild(discordBtn);

    discordBtn.addEventListener('click', function() {
        const slotList = generateSlotList();
        if (slotList) {
            sendToBot(slotList);
        } else {
            discordBtn.textContent = 'No slots found!';
            setTimeout(() => {
                discordBtn.textContent = 'Send Slot List to Discord';
            }, 1500);
        }
    });

    function generateSlotList() {
        const tournamentEl = document.querySelector('.play-off-tournament-name');
        const tournamentName = tournamentEl ? tournamentEl.textContent.trim() : "PREMIUM SCRIMS (8:40 PM)";
        const teamData = [];
        const teamSections = document.querySelectorAll('.team-name-slot');
        teamSections.forEach(section => {
            const slotText = section.textContent.trim();
            const slotMatch = slotText.match(/Slot\s+(\d+)/i);
            if (!slotMatch) return;
            const slotNumber = slotMatch[1];
            let teamNameEl = null;
            const parentEl = section.parentElement;
            if (parentEl) {
                teamNameEl = parentEl.querySelector('.team-name');
            }
            if (!teamNameEl) {
                const teamHeader = section.closest('section')?.querySelector('h1,h2,h3,h4,h5,h6');
                if (teamHeader && !teamHeader.textContent.includes('Slot')) {
                    teamNameEl = teamHeader;
                }
            }
            if (!teamNameEl) {
                const sectionParent = section.closest('section');
                if (sectionParent) {
                    const possibleTeamName = sectionParent.textContent.replace(slotText, '').trim();
                    if (possibleTeamName && !possibleTeamName.match(/^\s*Slot\s+\d+\s*$/i)) {
                        teamNameEl = { textContent: possibleTeamName };
                    }
                }
            }
            if (teamNameEl) {
                const teamName = teamNameEl.textContent.trim();
                if (teamName && !teamName.match(/^\s*Slot\s+\d+\s*$/i)) {
                    teamData.push({
                        name: teamName,
                        slot: slotNumber
                    });
                }
            }
        });
        if (teamData.length === 0) {
            const teamHeaders = document.querySelectorAll('div[class*="team"]');
            teamHeaders.forEach(header => {
                if (header.textContent && !header.textContent.match(/^\s*Slot\s+\d+\s*$/i)) {
                    let teamName = header.textContent.trim();
                    let slotNumber = "";
                    const slotEl = header.querySelector('[class*="slot"]') ||
                        header.parentElement?.querySelector('[class*="slot"]');
                    if (slotEl) {
                        const slotText = slotEl.textContent.trim();
                        const slotMatch = slotText.match(/Slot\s+(\d+)/i);
                        if (slotMatch) {
                            slotNumber = slotMatch[1];
                        }
                    }
                    if (!slotNumber) {
                        const nearbyText = header.parentElement?.textContent || "";
                        const slotMatch = nearbyText.match(/Slot\s+(\d+)/i);
                        if (slotMatch) {
                            slotNumber = slotMatch[1];
                        }
                    }
                    if (teamName && slotNumber) {
                        teamData.push({ name: teamName, slot: slotNumber });
                    }
                }
            });
        }

        const uniqueTeams = {};
        teamData.forEach(team => {
            if (team.name.match(/^\s*Slot\s+\d+\s*$/i)) return;
            const key = `${team.slot}-${team.name}`;
            uniqueTeams[key] = team;
        });

        const sortedTeams = Object.values(uniqueTeams).sort((a, b) =>
            parseInt(a.slot) - parseInt(b.slot)
        );

        const heading = tournamentName.toUpperCase();
        const underline = "=".repeat(30);

        let output = `*${heading}*\n${underline}\nSLOT LIST\n\n`;

        sortedTeams.forEach(team => {
            output += `SLOT ${team.slot} - ${team.name.toUpperCase()}\n`;
        });

        if (!sortedTeams.length) return null;
        return output.trim();
    }

    async function sendToBot(slotList) {
        discordBtn.textContent = 'Sending...';
        try {
            await fetch(BOT_ENDPOINT_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ slotList })
            });
            discordBtn.textContent = 'Sent!';
            setTimeout(() => {
                discordBtn.textContent = 'Send Slot List to Discord';
            }, 2000);
        } catch (e) {
            discordBtn.textContent = 'Failed! Check server';
            setTimeout(() => {
                discordBtn.textContent = 'Send Slot List to Discord';
            }, 3500);
        }
    }
})();
