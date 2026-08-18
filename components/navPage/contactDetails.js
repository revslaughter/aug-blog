import { ORGANIZATION, FORMATTED_ADDRESS } from "../../util/siteMeta";

/**
 * The farm's address and phone, shown when the CMS `contact_details` switch is
 * on.
 *
 * The prop is the switch, not the content: address and phone come from
 * `util/siteMeta.js` and are never passed in or typed into the Markdown. That
 * is deliberate — issue #9 was the phone number living in two places and being
 * fixed in one. Keeping the values behind the import means a caller cannot
 * accidentally render a different address here.
 *
 * @param {{show: boolean}} props Whether the section opted into the block.
 */
export default function NavContactDetails({ show }) {
  if (!show) return null;
  return (
    <ul>
      <li>
        <a target="_blank" rel="noreferrer" href={ORGANIZATION.mapsUrl}>
          {FORMATTED_ADDRESS}
        </a>
      </li>
      <li>
        <a href={`tel:${ORGANIZATION.telephone}`}>
          {ORGANIZATION.telephoneDisplay}
        </a>
      </li>
    </ul>
  );
}
