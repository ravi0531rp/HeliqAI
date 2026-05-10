import { Html, RoundedBox } from '@react-three/drei';

function Enzyme3D({ enzyme, pulse, selected, onSelect }) {
  const haloScale = 1 + pulse * 0.1;

  return (
    <group
      position={[0, 0, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
    >
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <capsuleGeometry args={[0.82 * haloScale, 1.95 * haloScale, 10, 18]} />
        <meshPhysicalMaterial
          color={selected ? '#7ef0d7' : '#2f5f77'}
          transmission={0.18}
          thickness={1}
          roughness={0.34}
          metalness={0.08}
          transparent
          opacity={0.88}
          emissive={selected ? '#7ef0d7' : '#113446'}
          emissiveIntensity={selected ? 0.3 : 0.1 + pulse * 0.12}
        />
      </mesh>
      <mesh position={[0, 0, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.08, 16, 60]} />
        <meshStandardMaterial
          color="#17394c"
          emissive="#17394c"
          emissiveIntensity={0.22}
        />
      </mesh>
      <mesh position={enzyme.activeSite} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.74, 0.1, 16, 48]} />
        <meshStandardMaterial
          color={selected ? '#f1ba6a' : '#7ef0d7'}
          emissive={selected ? '#f1ba6a' : '#7ef0d7'}
          emissiveIntensity={0.48 + pulse * 0.2}
        />
      </mesh>
      {enzyme.regulatoryRole && (
        <mesh position={[0, 0.96, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.12, 1.62, 6, 10]} />
          <meshStandardMaterial
            color="#f1ba6a"
            emissive="#f1ba6a"
            emissiveIntensity={0.28 + pulse * 0.18}
            transparent
            opacity={0.78}
          />
        </mesh>
      )}
      <Html
        position={[0, 2.2, 0]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: 'none',
          minWidth: 196,
          textAlign: 'center',
          fontSize: '0.84rem',
          lineHeight: 1.3,
          color: '#ecf9ff',
          padding: '9px 11px',
          borderRadius: 16,
          background: 'rgba(7, 17, 28, 0.82)',
          border: '1px solid rgba(130, 189, 214, 0.18)',
        }}
      >
        <strong>{enzyme.name}</strong>
        <div style={{ color: '#9cc3d2', marginTop: 4, fontSize: '0.73rem' }}>
          {enzyme.regulatoryRole || 'Catalytic block'}
        </div>
      </Html>
    </group>
  );
}

export default Enzyme3D;
