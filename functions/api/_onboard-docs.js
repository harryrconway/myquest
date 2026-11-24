// The documents a new starter reads in step 2, served only to a valid invite link. The agreement is the casual
// employment agreement from the MyQuest New Starter Pack (template), word for word, with the person's details filled in.
// When the pack in Google Drive changes, change it here too.

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function agreementHtml({ name, address, start }) {
  return `
<p>This agreement sets out the terms of your casual employment with MyQuest. Please read it, ask us anything that is unclear, and sign it before your first shift.</p>
<table class="kv">
<tr><th>Employer</th><td>MyQuest Pty Ltd, ABN 65 693 175 405, ACN 693 175 405</td></tr>
<tr><th>Employee</th><td>${esc(name)}</td></tr>
<tr><th>Employee address</th><td>${esc(address) || 'As given in step 1'}</td></tr>
<tr><th>Start date</th><td>${start ? `On or about ${esc(start)}` : 'The date of your induction'}</td></tr>
<tr><th>Position</th><td>Cleaner (casual)</td></tr>
<tr><th>Award</th><td>Cleaning Services Award 2020 (MA000022), Cleaning Services Employee Level 1</td></tr>
<tr><th>Pay</th><td>Per job: the job’s estimated hours × $35.00, with the award guarantee in clause 5</td></tr>
<tr><th>Pay period</th><td>Weekly, Monday to Sunday, paid no later than the Wednesday after the week ends</td></tr>
<tr><th>Reports to</th><td>Harry Conway, Director</td></tr>
<tr><th>Work locations</th><td>Client homes and premises across the Gold Coast and the Tweed</td></tr>
</table>
<h3>1. Your employment</h3>
<p><b>1.1</b> MyQuest employs you as a casual employee from the start date above. As a casual employee, there is no firm advance commitment to continuing work with an agreed pattern of hours.</p>
<p><b>1.2</b> MyQuest offers shifts through the ServiceM8 app. You may accept or decline any shift we offer.</p>
<p><b>1.3</b> The Cleaning Services Award 2020 (the <b>award</b>) and the National Employment Standards apply to your employment. If anything in this agreement gives you less than the award or the National Employment Standards, they apply instead.</p>
<p><b>1.4</b> MyQuest has given you the Fair Work Information Statement and the Casual Employment Information Statement with this agreement.</p>
<p><b>1.5</b> MyQuest is a small business. After 12 months of employment you may be able to ask to become a permanent employee under the employee choice pathway in the Fair Work Act, and we will give you the Casual Employment Information Statement again at that time.</p>
<h3>2. Your duties</h3>
<p><b>2.1</b> You will clean homes and commercial premises to MyQuest’s checklists and standards, using the equipment and products we provide and following their safety data sheets.</p>
<p><b>2.2</b> You will follow reasonable directions from MyQuest, the MyQuest Staff Handbook, and the safety, privacy and site rules of each client.</p>
<p><b>2.3</b> You will treat clients, their property and their premises with care and respect at all times.</p>
<p><b>2.4</b> MyQuest may ask you to do other reasonable duties that match your skills and classification.</p>
<h3>3. Before you start</h3>
<p><b>3.1</b> Your employment depends on a satisfactory national police check, provided before your first shift, and on you having the right to work in Australia.</p>
<p><b>3.2</b> Work in the homes of NDIS participants may also need an NDIS Worker Screening Check. MyQuest will tell you if it applies to you.</p>
<p><b>3.3</b> You must complete MyQuest’s induction before you work on your own.</p>
<h3>4. Shifts and breaks</h3>
<p><b>4.1</b> A shift is the set of jobs you accept in ServiceM8, with a start time and the job addresses.</p>
<p><b>4.2</b> You will be paid for at least the minimum engagement in the award for each shift. This is generally 2 hours, or 1 hour at a small stand alone site of 300m² or less where you are the only cleaner and a longer shift is not practical.</p>
<p><b>4.3</b> You will have meal and rest breaks as set out in the award, and at least 8 hours between the end of one shift and the start of the next.</p>
<h3>5. Pay</h3>
<p><b>5.1 Pay per job.</b> For each job you complete, MyQuest pays the job’s estimated hours, as shown on the job in ServiceM8, multiplied by $35.00. You keep the full amount if you finish earlier than the estimate.</p>
<p><b>5.2 Award guarantee.</b> For every pay period, MyQuest will work out what the award requires for the hours you actually worked, including travel time between jobs, the casual loading, shift and weekend penalty rates, public holiday rates and minimum engagements. If your pay per job is less than that amount, MyQuest will pay you the difference in the same pay.</p>
<p><b>5.3 What your pay covers.</b> Your pay per job includes the 25% casual loading. It is paid in satisfaction of the award’s minimum rates, casual loading, penalty rates and loadings for the hours you work, to the extent the law allows. Allowances and reimbursements in clause 6 are paid on top.</p>
<p><b>5.4 Recording your time.</b> You must check in and check out of every job in ServiceM8 and record travel between jobs accurately, so the award guarantee is worked out correctly.</p>
<p><b>5.5 When you are paid.</b> MyQuest pays you weekly into your nominated bank account, no later than the Wednesday after each week (Monday to Sunday) ends, and gives you a pay slip within one working day of payment.</p>
<p><b>5.6 Superannuation.</b> MyQuest pays superannuation contributions at the rate the law requires (12% at the date of this agreement) to the fund you choose, or to your stapled fund if you do not choose one.</p>
<h3>6. Travel, vehicles, allowances and uniform</h3>
<p><b>6.1</b> Travel time between jobs during a shift is work time and is included in the award guarantee in clause 5.2. MyQuest pays any fares for travel between jobs.</p>
<p><b>6.2</b> If MyQuest asks you to use your own vehicle for work and you agree, MyQuest pays the vehicle allowance in the award for the kilometres you travel between jobs. You must hold a current driver licence and insurance for any vehicle you use for work.</p>
<p><b>6.3</b> MyQuest pays any other allowance the award requires when it applies, such as the toilet cleaning, refuse collection and broken shift allowances.</p>
<p><b>6.4</b> MyQuest provides your uniform (2 shirts), your cleaning equipment and products, and your protective gear, and replaces them when reasonably needed. They remain MyQuest property and are for MyQuest work only. MyQuest records what it gives you. If MyQuest asks you to buy any uniform item, we will reimburse the cost.</p>
<h3>7. Leave and absences</h3>
<p><b>7.1</b> As a casual employee you do not receive paid annual leave or paid personal leave; the casual loading is paid instead. You have the National Employment Standards entitlements that apply to casual employees, including unpaid carer’s leave, unpaid compassionate leave, community service leave and paid family and domestic violence leave.</p>
<p><b>7.2</b> Long service leave applies under the relevant state law, including any portable long service leave scheme for the contract cleaning industry.</p>
<p><b>7.3</b> If you cannot attend a shift you have accepted, tell MyQuest as soon as possible, and at least 3 hours before it starts unless there is an emergency.</p>
<h3>8. Safety</h3>
<p><b>8.1</b> You must follow MyQuest’s safety procedures, use the protective equipment provided, and take reasonable care of your own safety and the safety of others.</p>
<p><b>8.2</b> If a task or site is unsafe, stop and contact MyQuest before you continue.</p>
<p><b>8.3</b> Report every injury, incident, near miss and hazard to MyQuest on the same day.</p>
<h3>9. Clients, keys and confidentiality</h3>
<p><b>9.1</b> Keep client keys, access cards and alarm codes secure and follow the key procedure in the Staff Handbook. Never copy a key, write down or share an alarm code, or let anyone else into a client’s premises.</p>
<p><b>9.2</b> Never take or use client property, and report any damage or breakage to MyQuest straight away.</p>
<p><b>9.3</b> Information about MyQuest’s clients, prices and business is confidential. You must not share it or use it for anything other than your work with MyQuest, during or after your employment.</p>
<p><b>9.4</b> While you work for MyQuest, you must not do private cleaning work for a MyQuest client, or for anyone you met through your MyQuest work, without MyQuest’s written agreement.</p>
<p><b>9.5</b> MyQuest handles your personal information in line with its privacy policy and the law.</p>
<h3>10. Quality</h3>
<p><b>10.1</b> You will complete each job’s checklist and take the photos ServiceM8 asks for.</p>
<p><b>10.2</b> If a client reports a problem with a clean, MyQuest may ask you to return and fix it. That time is paid work time and is included in the award guarantee.</p>
<h3>11. Ending your employment</h3>
<p><b>11.1</b> Either you or MyQuest may end your casual employment at any time by telling the other in writing. MyQuest may end your employment immediately for serious misconduct, such as theft, violence, being affected by alcohol or drugs at work, a serious safety breach or a breach of client confidentiality.</p>
<p><b>11.2</b> When your employment ends you must return all MyQuest property within 7 days, including keys, access cards, uniform, equipment, cleaning products, protective gear and anything else MyQuest gave you for work, and MyQuest will close your ServiceM8 access. If an item is not returned, MyQuest may ask you to return it or to pay its reasonable replacement cost. MyQuest will only deduct an amount from your pay if you agree to that deduction in writing at the time.</p>
<p><b>11.3</b> Your final pay, including any award guarantee payment, will be paid in the next pay run.</p>
<h3>12. General</h3>
<p><b>12.1</b> This agreement, together with the award and the National Employment Standards, sets out the terms of your employment and replaces any earlier discussions.</p>
<p><b>12.2</b> MyQuest’s Staff Handbook and policies explain how we work. You must follow them, but they do not form part of this agreement and MyQuest may update them from time to time.</p>
<p><b>12.3</b> Any change to this agreement must be in writing and signed by you and MyQuest.</p>
<p><b>12.4</b> This agreement is governed by the laws of Queensland.</p>
<h3>Signing</h3>
<p>By signing, the employee confirms they have read and understood this agreement, received the Fair Work Information Statement and the Casual Employment Information Statement, and had the chance to get independent advice. MyQuest Pty Ltd signs through Harry Conway, Director, when you send your details at the end.</p>`;
}

export const SAFETY_HTML = `
<p>We go through this together at your induction, and it takes about an hour. It goes with the MyQuest Staff Handbook and doesn’t repeat it.</p>
<h3>Your safety and ours</h3>
<p>MyQuest must keep you as safe as it reasonably can, and you must take reasonable care of yourself and anyone your work affects. Both duties come from the Work Health and Safety Act 2011 (Qld), and NSW has the same rules for jobs in the Tweed.</p>
<table><tr><th>MyQuest will</th><th>You will</th></tr>
<tr><td>Give you safe products, equipment and protective gear, and show you how to use them</td><td>Use them the way you were shown, and wear the gear the label calls for</td></tr>
<tr><td>Tell you about any hazard we know of at a site before you go</td><td>Follow reasonable safety instructions and the job checklist</td></tr>
<tr><td>Deal with any hazard you raise, and tell you what we did</td><td>Report hazards, near misses and injuries the same day</td></tr>
<tr><td>Never ask you to keep working somewhere unsafe</td><td>Stop and call us when something is unsafe</td></tr></table>
<p><b>You can always stop.</b> If you believe you face a serious risk right now, such as a gas smell, exposed wiring, an aggressive person or a needle you can’t handle safely, stop, move somewhere safe and call Harry on 0413 154 932. You will never be treated unfairly for stopping in good faith, and we may offer you other safe work instead.</p>
<p><b>Raising a concern.</b> Call Harry or add a note to the job in ServiceM8. If you are not happy with the answer, you can contact WorkSafe Queensland on 1300 362 128.</p>
<h3>Chemicals and protective gear</h3>
<p>Use only MyQuest products, and only the way the label and safety data sheet say. Most chemical injuries in cleaning come from mixing products, splashing concentrate, or spraying in a small room with no fresh air.</p>
<ul>
<li><b>Never mix products.</b> Bleach mixed with an acid toilet cleaner or descaler gives off chlorine gas, and mixed with ammonia it gives off chloramine. Use one, rinse, then use the other.</li>
<li><b>Keep products in their own bottles.</b> A spray bottle you dilute into must carry a MyQuest label with the product name and its hazard warnings. Never use a drink bottle.</li>
<li><b>Know the safety data sheets.</b> There is one for every product, in your kit folder and saved on your phone. Read it before you use a product for the first time.</li>
<li><b>Let air in.</b> Open a window or turn on the exhaust fan before spraying in bathrooms and small rooms.</li>
<li><b>Store products safely.</b> Lids on, upright, out of reach of children and pets, and never left behind at a client’s place.</li>
</ul>
<table><tr><th>Task</th><th>Wear</th></tr>
<tr><td>Every job</td><td>Enclosed, non slip shoes</td></tr>
<tr><td>Any wet cleaning, bathrooms and toilets</td><td>Gloves</td></tr>
<tr><td>Diluting concentrate, oven or mould cleaner, spraying above shoulder height</td><td>Gloves and safety glasses</td></tr>
<tr><td>Builder’s cleans with dust or cement residue</td><td>Gloves, safety glasses and a P2 mask; vacuum rather than dry sweep</td></tr>
<tr><td>Blood, body fluids or medical premises</td><td>Gloves, the spill kit, and the clinic’s own infection control rules</td></tr></table>
<p><b>Chemical in the eyes or on the skin?</b> Rinse with running water for at least 15 minutes, check the first aid section of the safety data sheet, and call the Poisons Information Centre on 13 11 26 (24 hours). If someone swallows a product or struggles to breathe, call 000.</p>
<h3>Lifting, slips, heights, power and heat</h3>
<p>Strains, slips and falls cause most cleaning injuries, so these habits matter on every job.</p>
<ul>
<li><b>Lifting.</b> Keep loads close, bend your knees and don’t twist while carrying. Fill mop buckets only halfway, use a trolley for anything heavy, and never move heavy furniture or appliances; note it on the job instead.</li>
<li><b>Repetitive work.</b> Use long handled tools so you aren’t bending and reaching, swap hands, and change tasks every half hour or so.</li>
<li><b>Slips and trips.</b> Put out a wet floor sign before mopping where anyone else walks, mop in sections so there is always a dry path, keep cords behind you, and wipe up spills straight away.</li>
<li><b>Heights.</b> Clean only what you can reach from the floor or the MyQuest two step platform ladder. Never stand on chairs, benches, baths or toilet seats, and never use a ladder on stairs.</li>
<li><b>Power.</b> Check the cord and plug on the vacuum and any other tool before each job. Don’t use anything damaged; label it “Do not use” and tell Harry. Unplug appliances before you clean them, and keep water away from power points. On construction sites, tools must carry a current test tag.</li>
<li><b>Broken glass and sharps.</b> Use a dustpan, never your hands, and wrap glass before it goes in the bin. Never pick up a needle; leave it, take a photo and call Harry.</li>
<li><b>Heat.</b> New builds and closed up houses get very hot in a Gold Coast summer. Drink water all shift, take breaks somewhere cool, and stop and call us if you feel dizzy, sick or confused.</li>
</ul>
<h3>Working alone and in client homes</h3>
<p>You will often clean on your own, so we always need to know where you are, and you always have a way out.</p>
<ul>
<li><b>Check in and out in ServiceM8 at every job.</b> If you haven’t checked out 30 minutes after a job should have finished, Harry will call you. If there’s no answer, Harry will call your emergency contact, then go to the site or call 000.</li>
<li><b>Keep your phone charged</b> and on you, not in the car.</li>
<li><b>Trust your instincts.</b> If a client or anyone else on site is aggressive, drunk, or makes you uncomfortable, leave straight away and call Harry. You don’t have to explain or finish the job.</li>
<li><b>Something looks wrong on arrival?</b> A forced door, someone unexpected inside, or anything that looks like a crime: don’t go in. Leave, call 000, then call Harry.</li>
<li><b>Dogs.</b> If a dog is loose and the job notes don’t say it is friendly, don’t go in. Call Harry.</li>
<li><b>Keys and alarm codes.</b> Sign keys in and out on the MyQuest Key Register and keep codes in ServiceM8 only, as the Staff Handbook explains.</li>
<li><b>Driving.</b> Never hold your phone while driving; let calls go to voicemail and ring back once parked.</li>
</ul>
<h3>NDIS and DVA clients</h3>
<p>When you clean for an NDIS participant, the NDIS Code of Conduct applies to you personally. We hold DVA clients to the same standard. In plain words, it asks you to:</p>
<ul>
<li>Respect their right to make their own choices about their home and their day</li>
<li>Keep what you see and hear private</li>
<li>Work safely, with care and skill</li>
<li>Be honest, including about mistakes and breakages</li>
<li>Raise any concern about their safety, or about the quality of our work, promptly</li>
<li>Help prevent, and report, any violence, exploitation, neglect or abuse</li>
<li>Help prevent, and report, any sexual misconduct</li>
<li>Never suggest a higher price because someone has NDIS funding</li>
</ul>
<p><b>In practice</b></p>
<ul>
<li>Introduce yourself at every visit, and wear your uniform so they know who you are.</li>
<li>Politely decline money, gifts and loans, and tell Harry if a client insists.</li>
<li>Never handle their cash, cards or medication, sign anything for them, or give medical advice.</li>
<li>Don’t swap personal phone numbers or arrange private work.</li>
<li><b>Found them hurt, on the floor or unwell?</b> Call 000 if needed and stay with them, then call Harry. Don’t try to lift someone who has fallen.</li>
<li><b>Noticed something worrying?</b> No food in the house, new injuries, the home becoming unsafe, or they tell you someone is hurting them: tell Harry privately the same day, and Harry will work out who else needs to know.</li>
</ul>
<h3>Incidents, injuries and emergencies</h3>
<p>Report every injury, incident and near miss the same day, however small. A small report today is what protects you if a sore back turns into a claim next month.</p>
<ol>
<li>Make it safe: stop, move away from the hazard, and give first aid if you can.</li>
<li>Call 000 for anything serious.</li>
<li>Call Harry on 0413 154 932 straight away, or the same day for anything minor.</li>
<li>After a serious incident, leave the scene as it is unless you need to help someone or make it safe.</li>
<li>Add a note and photos to the job in ServiceM8.</li>
<li>If you are hurt, see a doctor and tell them it happened at work.</li>
</ol>
<h3>Your first supervised clean</h3>
<p>Your first clean is done alongside Harry or a trainer. We sign you off to work alone once you do all of these without prompting; if not, we book another supervised clean.</p>
<ul>
<li>Checks in on arrival and out on leaving, in ServiceM8</li>
<li>Reads the job notes and access instructions before going in</li>
<li>Follows the checklist for the clean type, top to bottom and dry to wet</li>
<li>Uses the right colour cloth for each area</li>
<li>Chooses the right product, and wears the gear its label calls for</li>
<li>Knows where the safety data sheets are</li>
<li>Puts out the wet floor sign and keeps a dry path</li>
<li>Lifts and carries safely, with the bucket half full</li>
<li>Takes the before and after photos</li>
<li>Notes anything not done, and reports any breakage with a photo</li>
<li>Locks up, sets the alarm and signs keys back in</li>
</ul>
<p>At your induction we go through each part together, and you and Harry both sign the induction record.</p>`;

export const HANDBOOK_HTML = `
<p>Everything about working at MyQuest in one place: your first week, how we work, how you are paid, how we look after clients, their homes and each other, and the step by step procedures for every job.</p>
<h3>Your first week</h3>
<table><tr><th>Step</th><th>When</th><th>What happens</th></tr>
<tr><td>Get ready</td><td>Before your induction</td><td>Complete this onboarding, the Xero payroll link and ServiceM8.</td></tr>
<tr><td>Induction</td><td>The date in your welcome email</td><td>Safety, chemicals and colour coding, ServiceM8, keys and alarm codes, how pay works. Collect your uniform and kit, which stay MyQuest property and are returned when you finish.</td></tr>
<tr><td>Supervised clean</td><td>At the end of your induction</td><td>Your first clean alongside a trainer, then we sign you off.</td></tr>
<tr><td>On your own</td><td>After sign off</td><td>Accept shifts in ServiceM8 and start cleaning on your own.</td></tr>
<tr><td>First pay day</td><td>The Wednesday after your first week</td><td>Pay goes into your bank account, with a pay slip emailed from Xero. Super is paid on top.</td></tr></table>
<h3>Where everything lives</h3>
<table><tr><th>What</th><th>Where</th></tr>
<tr><td>Your jobs, addresses, access notes and checklists</td><td>ServiceM8 app</td></tr>
<tr><td>Pay slips</td><td>Emailed from Xero</td></tr>
<tr><td>Your signed agreement</td><td>Emailed to you when you finish this onboarding</td></tr>
<tr><td>What to clean on each job</td><td>The checklist on each job in ServiceM8</td></tr></table>
<h3>Five things that matter most</h3>
<ul>
<li>Check in and out of every job in ServiceM8.</li>
<li>Follow the checklist and take the before and after photos.</li>
<li>Keep keys safe, and keep alarm codes in ServiceM8 only.</li>
<li>Broke something? Take a photo and tell us straight away.</li>
<li>Hurt, or somewhere feels unsafe? Stop and call us. In an emergency, call 000 first.</li>
</ul>
<h3>Our standard</h3>
<p>Clients choose MyQuest because the job is done properly, every visit. That means:</p>
<ul>
<li>Every cleaner is police checked and personally interviewed.</li>
<li>We follow the checklist for every clean, including the places a quick once over misses.</li>
<li>We arrive when we say we will, and we treat every home and workplace as if it were our own.</li>
<li>Quality over quantity. A fast clean is great; a missed bathroom is not.</li>
</ul>
<h3>Shifts and ServiceM8</h3>
<ul>
<li><b>Accepting work.</b> We offer shifts in ServiceM8. You can accept or decline any shift.</li>
<li><b>Check in and check out</b> of every job in the app, on site. This records your time and is how we make sure you are always paid at least the award.</li>
<li><b>Follow the job checklist</b> and take the before and after photos it asks for.</li>
<li><b>Running late or can’t make it?</b> Tell us in ServiceM8 or call 0413 154 932 as soon as you know, and at least 3 hours before a shift unless it is an emergency.</li>
<li><b>Something you could not do,</b> such as a locked room or missing supplies? Note it on the job before you leave.</li>
</ul>
<h3>How you are paid</h3>
<p>You are paid per job: the job’s estimated hours, shown in ServiceM8, multiplied by $35.00. Clients never see an hour count, only the price and the result.</p>
<ul>
<li><b>Finish faster and you earn more per hour,</b> as long as the checklist is done properly.</li>
<li><b>You never get less than the award.</b> Each pay period we check your pay against the award for the hours you actually worked, including travel between jobs, weekend and shift rates, and minimum shift lengths. If it falls short, we pay the difference.</li>
<li><b>Travel between jobs counts as work time,</b> and we pay any fares. If you agree to use your own car between jobs, we pay the award’s vehicle allowance.</li>
<li><b>Pay day</b> is weekly. Each pay week runs Monday to Sunday and is paid on the Wednesday after, with a pay slip from Xero. Super is paid into your fund with every pay, on top of your wages.</li>
</ul>
<p><b>Example: a job estimated at 2.75 hours pays $96.25</b></p>
<table><tr><th>Time you take</th><th>You earn per hour</th><th>Top up from MyQuest</th></tr>
<tr><td>2 hours 12 minutes (20% quicker)</td><td>$43.75</td><td>None</td></tr>
<tr><td>2 hours 45 minutes (on time)</td><td>$35.00</td><td>None</td></tr>
<tr><td>3 hours (9% longer)</td><td>$33.85 (weekday award rate)</td><td>$5.30</td></tr></table>
<p>Weekday daytime figures for a casual Level 1 cleaner at the award rates from 1 July 2026. Saturday, Sunday, public holiday and early or late shifts have higher award rates, and the top up covers those too.</p>
<h3>Doing the job</h3>
<ul>
<li>Follow the checklist for the clean type: office, home, medical, gym, retail or builder’s clean.</li>
<li>Use only MyQuest products, and only as the label and safety data sheet say. Never mix chemicals.</li>
<li>Work top to bottom and dry to wet, and finish each room before moving on.</li>
</ul>
<table><tr><th>Colour</th><th>Use it for</th></tr>
<tr><td>Red</td><td>Toilets and urinals only</td></tr>
<tr><td>Yellow</td><td>Bathroom basins, showers and other washroom surfaces</td></tr>
<tr><td>Green</td><td>Kitchens and food areas</td></tr>
<tr><td>Blue</td><td>General areas: desks, offices, glass and furniture</td></tr></table>
<h3>Client homes and premises</h3>
<ul>
<li><b>Keys and access cards</b> are signed out and back in on the MyQuest Key Register. Keep them on you, never label them with the client’s address, and never copy them.</li>
<li><b>Alarm codes</b> are kept in ServiceM8 only. Never write them down or share them.</li>
<li><b>Lock up</b> every door and window you opened, set the alarm if there is one, and check before you leave.</li>
<li><b>Nobody comes with you.</b> No friends, family or children on site.</li>
<li><b>Client property</b> stays where it is. Don’t use their phone, computer, food or drinks unless the client has offered.</li>
<li><b>Breakages and damage</b> are reported to us straight away, with a photo. Accidents happen; hiding them is the problem.</li>
<li><b>Pets</b> stay where the client has left them. Note on the job if a pet needs attention.</li>
<li><b>Photos</b> are taken only for the job in ServiceM8, never for social media.</li>
</ul>
<h3>How we work together</h3>
<ul>
<li>Wear your MyQuest uniform and keep a neat appearance.</li>
<li>No alcohol or drugs before or during work.</li>
<li>Keep your phone for work while on a job: ServiceM8, calls from us, and emergencies.</li>
<li>Client details, prices and anything you see in a client’s home or business stay private.</li>
<li>Don’t take private cleaning work from MyQuest clients while you work for us.</li>
<li>If a client complains, stay polite, don’t argue, and let us handle it.</li>
<li>Got a concern about your pay, a job or another staff member? Talk to Harry Conway. You won’t be treated unfairly for raising it.</li>
</ul>
<h3>Leave and time off</h3>
<ul>
<li>As a casual, you choose which shifts to accept. Let us know your availability in ServiceM8 so we can offer you the right work.</li>
<li>If you are sick or need to care for someone, tell us as soon as you can.</li>
<li>Paid family and domestic violence leave is available to every employee, including casuals. Talk to Harry Conway privately; it stays confidential.</li>
</ul>
<h3>On the job, step by step</h3>
<p><b>Before a shift.</b> Check your jobs in ServiceM8: times, addresses, access notes and checklists. Check your kit: labelled products, colour coded cloths and mops, gloves and eye protection, bin liners, vacuum and wet floor sign. Wear your uniform, charge your phone, and plan your route so you arrive on time.</p>
<p><b>Arriving on site.</b> Arrive on time and park where the access notes say. Check in on the job in ServiceM8. Enter the agreed way and disarm the alarm with the code in ServiceM8. Walk through quickly, and photograph any existing damage and note it on the job. Check for hazards such as broken glass, sharps, wet floors or an aggressive pet. If it is unsafe, leave and call Harry.</p>
<p><b>The clean.</b> Follow the job checklist in order, top to bottom and dry to wet, one room at a time, with the right colour cloth. Use products only as the label says. In medical rooms, follow the clinic’s infection control rules, change cloths between rooms, and never touch sharps or clinical waste. On builder’s cleans, wear a dust mask, remove stickers and paint marks carefully, and photograph anything you can’t remove. Note anything you can’t do with a photo.</p>
<p><b>Finishing and locking up.</b> Walk through every room against the checklist and take the after photos. Empty bins, put items back where they were, and turn off lights and appliances you used. Lock every door and window you opened and set the alarm. Leave keys in the agreed place, or keep MyQuest held keys on you. Check out of the job in ServiceM8 and add any notes.</p>
<p><b>If you can’t get in.</b> Call the site contact straight away, then Harry. Wait up to 15 minutes while we try to reach the client. If no one can let you in, photograph the entry, note it on the job and leave. You are paid for your time on a lockout.</p>
<p><b>Running late or can’t make a shift.</b> Tell Harry in ServiceM8 or by phone as soon as you know, and at least 3 hours before a shift unless it is an emergency.</p>
<p><b>Keys and alarm codes.</b> Keys and cards are tagged with an ID, never the client’s name or address, and signed out and back in on the Key Register. Alarm codes stay in ServiceM8 only. Lost a key or card? Tell Harry straight away.</p>
<p><b>Damage and breakages.</b> Stop and make it safe, photograph the damage and where it happened, and tell Harry straight away. Never hide it or try to fix it yourself.</p>
<p><b>Injuries and incidents.</b> In an emergency, call 000 and give first aid if you are trained. Make the area safe, and tell Harry the same day, including near misses.</p>
<h3>Who to contact</h3>
<table><tr><th>For</th><th>Contact</th></tr>
<tr><td>Shifts, jobs and pay</td><td>Harry Conway, 0413 154 932, hello@myquest.au</td></tr>
<tr><td>Emergencies</td><td>000 first, then call us</td></tr>
<tr><td>Poisons Information Centre</td><td>13 11 26, 24 hours</td></tr>
<tr><td>Your rights at work</td><td>Fair Work Ombudsman, fairwork.gov.au, 13 13 94</td></tr></table>
<p>This handbook explains how MyQuest works. It is not part of your employment agreement, and MyQuest may update it. Your employment agreement, the Cleaning Services Award 2020 and the National Employment Standards set your legal entitlements.</p>`;
